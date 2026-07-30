using System.Globalization;
using System.Text;
using System.Threading.RateLimiting;
using FluentValidation;
using LoadoutQueue.Api.Domain.Entities;
using LoadoutQueue.Api.Features.Authentication;
using LoadoutQueue.Api.Features.Dashboard;
using LoadoutQueue.Api.Features.GearItems;
using LoadoutQueue.Api.Features.GearLists;
using LoadoutQueue.Api.Infrastructure.Authentication;
using LoadoutQueue.Api.Infrastructure.Health;
using LoadoutQueue.Api.Middleware;
using LoadoutQueue.Api.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

if (int.TryParse(
        Environment.GetEnvironmentVariable("PORT"),
        out var railwayPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{railwayPort}");
}

ValidatorOptions.Global.LanguageManager.Culture = new CultureInfo("es");
ValidatorOptions.Global.DisplayNameResolver = (_, member, _) =>
    member?.Name switch
    {
        "DisplayName" => "Nombre visible",
        "Email" => "Correo electrónico",
        "Password" => "Contraseña",
        "ConfirmPassword" => "Confirmación de contraseña",
        "Name" => "Nombre",
        "Description" => "Descripción",
        "Category" => "Categoría",
        "Priority" => "Prioridad",
        "Status" => "Estado",
        "EstimatedPrice" => "Precio estimado",
        "ActualPrice" => "Precio real",
        "ProductUrl" => "URL del producto",
        "ImageUrl" => "URL de la imagen",
        "StoreName" => "Tienda",
        "Notes" => "Notas",
        "Version" => "Versión",
        "Items" => "Accesorios",
        "ItemId" => "Identificador del accesorio",
        "Position" => "Posición",
        _ => member?.Name ?? "Campo"
    };

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "LoadoutQueue.Api")
        .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
        .WriteTo.Console();
});

builder.Services.AddDbContext<ApplicationDbContext>((services, options) =>
{
    var configuration = services.GetRequiredService<IConfiguration>();
    var connectionString = configuration
        .GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException(
            "ConnectionStrings:DefaultConnection must be configured.");
    }

    options.UseNpgsql(connectionString);
});

builder.Services
    .AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .Validate(
        options => Encoding.UTF8.GetByteCount(options.SigningKey) >= 32,
        "Jwt:SigningKey must contain at least 32 bytes.")
    .Validate(
        options =>
            options.AccessTokenMinutes > 0 &&
            options.RefreshTokenDays > 0,
        "JWT token lifetimes must be positive.")
    .ValidateOnStart();

builder.Services
    .AddOptions<PasswordRecoveryOptions>()
    .Bind(builder.Configuration.GetSection(PasswordRecoveryOptions.SectionName))
    .Validate(
        options => Uri.TryCreate(
            options.FrontendBaseUrl,
            UriKind.Absolute,
            out var uri) &&
            uri.Scheme is "http" or "https",
        "PasswordRecovery:FrontendBaseUrl must be an absolute HTTP(S) URL.")
    .Validate(
        options => options.TokenLifetimeMinutes is >= 5 and <= 120,
        "PasswordRecovery:TokenLifetimeMinutes must be between 5 and 120.")
    .ValidateOnStart();

builder.Services
    .AddOptions<ResendOptions>()
    .Bind(builder.Configuration.GetSection(ResendOptions.SectionName));

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireDigit = true;
        options.Password.RequireNonAlphanumeric = false;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
{
    var lifetimeMinutes = builder.Configuration.GetValue(
        "PasswordRecovery:TokenLifetimeMinutes",
        30);
    options.TokenLifespan = TimeSpan.FromMinutes(lifetimeMinutes);
});

builder.Services
    .AddDataProtection()
    .SetApplicationName("GearList")
    .PersistKeysToDbContext<ApplicationDbContext>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services
    .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOptions>>((options, configuredJwt) =>
    {
        var jwt = configuredJwt.Value;
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services
    .AddHttpClient<IPasswordResetEmailSender, ResendPasswordResetEmailSender>(
        client =>
        {
            client.BaseAddress = new Uri("https://api.resend.com/");
            client.Timeout = TimeSpan.FromSeconds(15);
        });
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<GearItemReorderService>();
builder.Services.AddScoped<GearItemService>();
builder.Services.AddScoped<GearListService>();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(
        "authentication",
        context => RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
    options.AddPolicy(
        "password-recovery",
        context => RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition(
        "Bearer",
        new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Enter the JWT access token."
        });
});
builder.Services.AddProblemDetails();

builder.Services
    .AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("postgres", tags: ["ready"]);

var app = builder.Build();

if (args.Contains("--migrate", StringComparer.OrdinalIgnoreCase))
{
    await using var scope = app.Services.CreateAsyncScope();
    var database = scope.ServiceProvider
        .GetRequiredService<ApplicationDbContext>();
    app.Logger.LogInformation("Applying database migrations.");
    await database.Database.MigrateAsync();
    app.Logger.LogInformation("Database migrations applied successfully.");
    return;
}

app.UseForwardedHeaders();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseRouting();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Gear List API v1");
        options.DocumentTitle = "Gear List API";
    });
}

app.MapGet("/", () => Results.Ok(new
{
    name = "Gear List API",
    version = "0.9.0",
    stage = "quality"
}));

app.MapHealthChecks(
    "/health",
    new HealthCheckOptions
    {
        Predicate = _ => false,
        ResponseWriter = HealthResponseWriter.WriteAsync
    });

app.MapHealthChecks(
    "/api/health",
    new HealthCheckOptions
    {
        Predicate = registration => registration.Tags.Contains("ready"),
        ResponseWriter = HealthResponseWriter.WriteAsync
    });

app.MapAuthenticationEndpoints();
app.MapDashboardEndpoints();
app.MapGearItemEndpoints();
app.MapGearListEndpoints();

app.Run();

public partial class Program;
