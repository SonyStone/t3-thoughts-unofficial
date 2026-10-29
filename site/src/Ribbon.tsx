import { t } from "./i18n";

/** A plain diagonal band across the top-right corner, clipped by its square box so it never widens the page. */
export default function Ribbon() {
  return (
    <div class="ribbon-box">
      <div class="ribbon" role="img" aria-label={t().unofficial}>
        UNOFFICIAL
      </div>
    </div>
  );
}
