using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace LoadoutQueue.Api.Common.Security;

public static class CurrentUserExtensions
{
    public static bool TryGetUserId(
        this ClaimsPrincipal principal,
        out Guid userId)
    {
        var subject = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(subject, out userId);
    }
}
