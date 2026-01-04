/**
 * Represents standard HTTP methods used in RESTful API communications.
 *
 * These methods indicate the desired action to be performed for a given resource.
 */
export enum HttpMethod {
  /**
   * The GET method requests a representation of the specified resource.
   * Requests using GET should only retrieve data.
   */
  GET = "GET",

  /**
   * The POST method submits an entity to the specified resource, often causing
   * a change in state or side effects on the server.
   */
  POST = "POST",

  /**
   * The PUT method replaces all current representations of the target resource
   * with the request payload.
   */
  PUT = "PUT",

  /**
   * The DELETE method deletes the specified resource.
   */
  DELETE = "DELETE",

  /**
   * The PATCH method applies partial modifications to a resource.
   */
  PATCH = "PATCH",

  /**
   * The HEAD method asks for a response identical to a GET request, but without the response body.
   */
  HEAD = "HEAD",

  /**
   * The OPTIONS method describes the communication options for the target resource.
   */
  OPTIONS = "OPTIONS",
}
