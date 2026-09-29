// Public community endpoints: events, feedback submission, merchandise,
// characters and upcoming releases.
using FanHubPlus.Application.DTOs;
using FanHubPlus.Application.Services;
using FanHubPlus.Domain;
using FanHubPlus.Infrastructure;
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
    /// which is why CurrentUserId is optional here. An anonymous submission lands
    /// in the admin queue with a null author, which is intended: the queue has to
    /// see a bug report from someone who never made an account.
    [HttpPost("feedback")]
    [AllowAnonymous]
    public Task<IActionResult> SubmitFeedback(CreateFeedbackRequest request) =>
        Guarded(async () => Ok(await _community.SubmitFeedbackAsync(
            request, CurrentUserId, HttpContext.RequestAborted)));

    /// <summary>
    /// The signed-in fan's own feedback, newest first.
    /// </summary>
    /// <remarks>
    /// This is what the "What you've sent" panel on the feedback page reads. That
    /// panel used to be a localStorage array written on submit, so a report was
    /// only ever visible on the browser that sent it and never reached an
    /// administrator at all. It needs an account, unlike the POST above, because
    /// anonymous rows have no user id to filter on.
    /// </remarks>
    [HttpGet("feedback/mine")]
    [Authorize]
    public Task<IActionResult> MyFeedback([FromQuery] int pageSize = 25) =>
        Guarded(async () =>
        {
            var result = await _community.GetFeedbackAsync(
                null, 1, pageSize, RequireUserId(), HttpContext.RequestAborted);

            // Unwrapped to a bare array, matching the submissions "mine" endpoint.
            return Ok(result.Items);
        });

    /// GET /api/community/merchandise?category=&search=&isUpcoming=&sort=&page=&pageSize=
    [HttpGet("merchandise")]
    [AllowAnonymous]
    public Task<IActionResult> Merchandise(
        [FromQuery] byte? categoryId,
        [FromQuery] string? search,
        [FromQuery] bool? isUpcoming,
        [FromQuery] string? sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24) =>
        Guarded(async () => Ok(await _community.BrowseMerchandiseAsync(
            new MerchandiseQuery
            {
                CategoryId = categoryId,
                Search = search,
                IsUpcoming = isUpcoming,
                SortBy = sort ?? "name",
                Page = page,
                PageSize = pageSize,
            },
            HttpContext.RequestAborted)));

    [HttpGet("characters")]
    [AllowAnonymous]
    public Task<IActionResult> Characters([FromQuery] byte? categoryId) =>
        Guarded(async () => Ok(await _community.GetCharactersAsync(categoryId, HttpContext.RequestAborted)));

    /// GET /api/community/cover-pools?perCategory=24
    ///
    /// A small sample of real cover paths per fandom, for titles that have none.
    /// Manga ships with 449 titles and no cover files, so without something to
    /// fall back to its whole catalogue renders as placeholder tiles.
    ///
    /// Capped rather than returning every cover: this is ample for visual
    /// variety, and sending all 2,675 paths would be ~100KB of JSON the client
    /// fetches once per session just to choose one image from.
    [HttpGet("cover-pools")]
    [AllowAnonymous]
    public Task<IActionResult> CoverPools([FromQuery] int perCategory = 24) =>
        Guarded(async () => Ok(await _community.GetCoverPoolsAsync(perCategory, HttpContext.RequestAborted)));

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

    /// <summary>
    /// The caller's own submissions, filtered by user id in the query.
    /// </summary>
    /// <remarks>
    /// This used to page over every submission and then keep only those whose
    /// display name matched the caller's, which leaked other people's drafts
    /// whenever the page happened to contain them, hid the caller's own once
    /// there were more than a page, and treated two people with the same name as
    /// one person. Filtering on the id the token actually carries fixes all three.
    /// </remarks>
    [HttpGet("submissions/mine")]
    [Authorize]
    public Task<IActionResult> MySubmissions(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25) =>
        Guarded(async () =>
        {
            var result = await _community.GetSubmissionsAsync(
                null, page, pageSize, RequireUserId(), kind: null, HttpContext.RequestAborted);

            // Unwrap the page: the client expects a bare array, as it always has.
            return Ok(result.Items);
        });
}
