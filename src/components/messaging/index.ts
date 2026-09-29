/**
 * Messaging components.
 *
 * The conversations UI lives in the route folder rather than here, because the
 * portal and the standalone Relay product share these files by copy and the
 * route is what both are built around. This barrel intentionally exports
 * nothing: the Matrix implementation it used to re-export had no homeserver
 * configured and no rows, so it could only ever render a connection error.
 */
export {}

