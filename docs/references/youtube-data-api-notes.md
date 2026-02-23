# youtube-data-api notes
Owner: platform
Status: active
Last Reviewed: 2026-02-23

Copied constraints for agent visibility:
- Use `videos.list` with `chart=mostPopular` for chart pulls.
- Use `videos.insert` resumable upload for publishing.
- Track quota cost and policy changes over time.
- Follow YouTube Developer Policies; avoid prohibited scraping patterns.

Primary sources:
- https://developers.google.com/youtube/v3/docs/videos/list
- https://developers.google.com/youtube/v3/docs/videos/insert
- https://developers.google.com/youtube/terms/developer-policies
- https://developers.google.com/youtube/v3/revision_history

## Related Docs
- `../product-specs/youtube-upload.md`
- `../SECURITY.md`
- `../RELIABILITY.md`
