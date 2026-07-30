using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Encodings.Web;
using Microsoft.Extensions.Options;

namespace LoadoutQueue.Api.Features.Authentication;

public interface IPasswordResetEmailSender
{
    Task SendAsync(
        string recipientEmail,
        string recipientName,
        Uri resetLink,
        CancellationToken cancellationToken);
}

public sealed class ResendPasswordResetEmailSender(
    HttpClient httpClient,
    IOptions<ResendOptions> configuredOptions)
    : IPasswordResetEmailSender
{
    public async Task SendAsync(
        string recipientEmail,
        string recipientName,
        Uri resetLink,
        CancellationToken cancellationToken)
    {
        var options = configuredOptions.Value;

        if (string.IsNullOrWhiteSpace(options.ApiKey))
        {
            throw new InvalidOperationException(
                "Resend:ApiKey must be configured to send password reset emails.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "emails");
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            options.ApiKey);
        request.Headers.UserAgent.ParseAdd("gear-list-api/1.0");
        request.Content = JsonContent.Create(new
        {
            from = $"{options.FromName} <{options.FromAddress}>",
            to = new[] { recipientEmail },
            subject = "Recupera tu contraseña de Gear List",
            html = CreateHtml(recipientName, resetLink),
            text = CreateText(recipientName, resetLink)
        });

        using var response = await httpClient.SendAsync(
            request,
            cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private static string CreateHtml(string name, Uri resetLink)
    {
        var encodedName = HtmlEncoder.Default.Encode(name);
        var encodedLink = HtmlEncoder.Default.Encode(resetLink.AbsoluteUri);

        return $$"""
            <!doctype html>
            <html lang="es">
            <body style="margin:0;background:#07111b;color:#f2f6f9;font-family:Arial,sans-serif">
              <div style="max-width:560px;margin:0 auto;padding:40px 24px">
                <p style="color:#f28a48;font-size:12px;letter-spacing:2px;text-transform:uppercase">Gear List</p>
                <h1 style="font-size:30px;line-height:1.2">Recupera tu contraseña</h1>
                <p style="color:#b6c1ca;line-height:1.6">Hola, {{encodedName}}. Recibimos una solicitud para cambiar la contraseña de tu cuenta.</p>
                <p style="margin:32px 0">
                  <a href="{{encodedLink}}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#f28a48;color:#08111a;font-weight:700;text-decoration:none">Crear nueva contraseña</a>
                </p>
                <p style="color:#b6c1ca;line-height:1.6">El enlace vence en 30 minutos y solo puede utilizarse una vez. Si no solicitaste este cambio, puedes ignorar este correo.</p>
                <p style="color:#748796;font-size:12px;line-height:1.6">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="{{encodedLink}}" style="color:#8bc6e8">{{encodedLink}}</a></p>
              </div>
            </body>
            </html>
            """;
    }

    private static string CreateText(string name, Uri resetLink)
    {
        return $"""
            Hola, {name}.

            Recibimos una solicitud para cambiar la contraseña de tu cuenta de Gear List.
            Crea una nueva contraseña desde este enlace:

            {resetLink.AbsoluteUri}

            El enlace vence en 30 minutos y solo puede utilizarse una vez.
            Si no solicitaste este cambio, puedes ignorar este correo.
            """;
    }
}
