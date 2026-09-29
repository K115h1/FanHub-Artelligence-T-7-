// ITokenService, issues the JWT the API authenticates with.
//
// Kept behind an interface so AuthService does not depend on the JWT library
// directly, and so tests can return a fixed token.
namespace FanHubPlus.Application.Services;

public record IssuedToken(string Value, DateTime ExpiresAt);

public interface ITokenService
{
    IssuedToken CreateToken(FanHubPlus.Domain.User user, IEnumerable<string> roles);
}
