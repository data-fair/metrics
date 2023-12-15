// cf nginx config
// log_format operation escape=json '["$host","$reqref",$request_time,$bytes_sent,$status,"$upstream_http_x_owner","$cookie_id_token","$cookie_id_token_org","$http_x_apikey","$http_x_account","$http_x_processing","$upstream_cache_status","$upstream_http_x_resource","$upstream_http_x_operation"]';
export type LogLine = [
  host: string,
  reqref: string,
  request_time: number,
  bytes_sent: number,
  status: number,
  owner: string,
  id_token: string,
  id_token_org: string,
  apikey: string,
  account: string,
  processing: string,
  cache_status: string,
  resource: string,
  operation: string
]

export type User = {
  id: string,
  organization?: {
    id: string
  }
}
