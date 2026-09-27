// Base controller with the bits every controller here needs: the signed-in
// user's id, and a single place to turn a ValidationException into a 400.
using FanHubPlus.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace FanHubPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    /// The signed-in user's id, or null on an anonymous endpoint.
    protected uint? CurrentUserId
    {
        get
        {
            var raw = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return uint.TryParse(raw, out var id) ? id : null;
        }
    }

    protected uint RequireUserId() =>
        CurrentUserId ?? throw new ValidationException("You need to be signed in.");

    /// Wraps a call so a bad input becomes a 400 with the message, rather than
    /// a 500. Keeps try/catch out of every action.
    protected async Task<IActionResult> Guarded(Func<Task<IActionResult>> action)
    {
        try
        {
            return await action();
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
