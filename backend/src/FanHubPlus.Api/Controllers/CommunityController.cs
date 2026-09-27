// Public community endpoints: events, feedback submission, merchandise,
// characters and upcoming releases.
using FanHubPlus.Application.DTOs;
using FanHubPlus.Application.Services;
using FanHubPlus.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanHubPlus.Api.Controllers;

[Route("api/community")]
public class CommunityController : ApiControllerBase
{
    private readonly ICommunityService _community;

    public CommunityController(ICommunityService community)
    {
        _community = community;
    }

    [HttpGet("events")]
    [AllowAnonymous]
    public Task<IActionResult> Events([FromQuery] byte? categoryId) =>
        Guarded(async () => Ok(await _community.GetEventsAsync(categoryId, HttpContext.RequestAborted)));

    [HttpGet("events/{id:int}")]
    [AllowAnonymous]
    public Task<IActionResult> Event(uint id) =>
        Guarded(async () =>
        {
            var dto = await _community.GetEventAsync(id, HttpContext.RequestAborted);
            return dto is null ? NotFound() : Ok(dto);
        });

    /// Feedback is public by design — visitors can send it without an account,
    /// which is why CurrentUserId is optional here.
    [HttpPost("feedback")]
    [AllowAnonymous]
    public Task<IActionResult> SubmitFeedback(CreateFeedbackRequest request) =>
        Guarded(async () => Ok(await _community.SubmitFeedbackAsync(
            request, CurrentUserId, HttpContext.RequestAborted)));

    [HttpGet("merchandise")]
    [AllowAnonymous]
    public Task<IActionResult> Merchandise([FromQuery] byte? categoryId) =>
        Guarded(async () => Ok(await _community.GetMerchandiseAsync(categoryId, HttpContext.RequestAborted)));

    [HttpGet("characters")]
    [AllowAnonymous]
    public Task<IActionResult> Characters([FromQuery] byte? categoryId) =>
        Guarded(async () => Ok(await _community.GetCharactersAsync(categoryId, HttpContext.RequestAborted)));

    [HttpGet("upcoming-releases")]
    [AllowAnonymous]
    public Task<IActionResult> UpcomingReleases() =>
        Guarded(async () => Ok(await _community.GetUpcomingReleasesAsync(HttpContext.RequestAborted)));

    /// Fan submissions need an account, so unlike feedback this one requires one.
    [HttpPost("submissions")]
    [Authorize]
    public Task<IActionResult> CreateSubmission(CreateSubmissionRequest request) =>
        Guarded(async () => Ok(await _community.CreateSubmissionAsync(
            request, RequireUserId(), HttpContext.RequestAborted)));

    [HttpGet("submissions/mine")]
    [Authorize]
    public Task<IActionResult> MySubmissions(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25) =>
        Guarded(async () =>
        {
            var all = await _community.GetSubmissionsAsync(null, page, pageSize, HttpContext.RequestAborted);
            var mine = all.Items.Where(s => s.UserName == CurrentUserName()).ToList();
            return Ok(mine);
        });

    private string? CurrentUserName() => User.Identity?.Name;
}
