/**
 * Host half of dsh-ui-tidy.
 *
 * All behaviour lives in the client half (`./client`): the top-bar controls and
 * the sidebar stylesheet. This module exists so the bundle has a loadable host
 * entry, as the bundle patch inserts a plugin row for the package name.
 *
 * @returns {void}
 */
export function apply() {}