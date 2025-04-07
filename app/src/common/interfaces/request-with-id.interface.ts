export interface RequestWithId extends Express.Request {
  id?: string;
  method?: string;
  url?: string;
  ip?: string;
}
