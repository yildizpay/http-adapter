import axios from "axios";

/**
 * The default HTTP client instance based on Axios.
 *
 * This pre-configured Axios instance serves as the underlying transport layer for
 * standard HTTP requests within the adapter. It can be customized or replaced
 * if a different configuration or HTTP library is required.
 */
export const defaultHttpClient = axios.create();
