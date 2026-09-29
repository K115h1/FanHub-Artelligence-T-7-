// JwtTokenService, issues the bearer token the API authenticates with.
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FanHubPlus.Application.Services;
using FanHubPlus.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace FanHubPlus.Api.Services;

public class JwtTokenService : ITokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config)
    {
        _config = config;
    }

    public IssuedToken CreateToken(User user, IEnumerable<string> roles)
    {
        var key = _config["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "Jwt:Key is not set. Add it to user-secrets or the environment.");

        var issuer = _config["Jwt:Issuer"] ?? "FanHubPlus";
        var audience = _config["Jwt:Audience"] ?? "FanHubPlusClient";
        var hours = int.TryParse(_config["Jwt:ExpiryHours"], out var h) ? h : 8;

        var expires = DateTime.UtcNow.AddHours(hours);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.Name),
        };

        // Role goes in as a claim so [Authorize(Roles = "admin")] works.
        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expires,
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                SecurityAlgorithms.HmacSha256));

        return new IssuedToken(new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
