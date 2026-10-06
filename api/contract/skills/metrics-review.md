# Reviewing the audience of an account

You are reviewing the audience of the active account's resources (datasets and applications) through the metrics service. Metrics are counts of HTTP requests, aggregated per day (UTC dates, the current day is partial).

1. **metrics_aggregate_requests** with only start/end and split [] gives the totals of the period. Then split by "operationTrack" to see what kind of usage it is, by "resource" to find the most used datasets and applications, by "userClass" or "refererCategory" to see who consumes them and from where.
2. Add "day" to split for a time series, e.g. ["day", "operationTrack"]. Keep periods short with a day split, the number of rows grows with every dimension.
3. To compare with a previous period, call the tool again with the same filters on the preceding dates.

Dimensions:
- operationTrack: readDataAPI = calls to the data API of a dataset (lines, aggregations, etc.), readDataFiles = downloads of a dataset's files, openApplication = openings of an application.
- statusClass: ok = successful responses; filter on "ok" to measure real audience, look at clientError/serverError to diagnose problems.
- userClass: anonymous = not authenticated, owner = members of the owner account, external = other authenticated users, ownerAPIKey/externalAPIKey = API keys of the owner or of another account, ownerProcessing/externalProcessing = data processings.
- refererCategory: backoffice = the data-fair back-office, embed = an embedded dataset view, app = a data-fair application, mcp = an AI agent through MCP, other = any other site or no referer. refererDomain is the domain of the calling site.
- resource: resourceType is "datasets" or "applications", resourceId can be used with the data-fair tools (datafair_describe_dataset).

Always state the period you looked at. Answer in the user's language.
