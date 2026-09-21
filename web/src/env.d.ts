/** Build-time flags, set by the Dockerfile from a single argument (see docs/07-interface.md). */
interface ImportMetaEnv {
  /**
   * "true" when the web image was built with distant favicons allowed. The same argument opens
   * `img-src` in the CSP, so the flag and the policy can never disagree.
   */
  readonly VITE_FAVICONS_DISTANTES?: string;
}
