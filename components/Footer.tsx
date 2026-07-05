import { SITE } from "@/lib/siteConfig";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={`checker ${styles.flag}`} aria-hidden="true" />
        <span>
          © {new Date().getFullYear()} {SITE.name} — BUILT WITH NEXT.JS · R3F · GSAP ·
          3D CAR MODEL BY DIL AFROZE AHMAD. Ferrari® and all team/sponsor names,
          logos and liveries shown are trademarks of their respective owners; this
          is an unaffiliated fan/portfolio project, not endorsed by or affiliated
          with them.
        </span>
        <div className={styles.links}>
          <a href={SITE.github} target="_blank" rel="noreferrer">
            GITHUB
          </a>
          <a href={SITE.linkedin} target="_blank" rel="noreferrer">
            LINKEDIN
          </a>
          <a href={`mailto:${SITE.email}`}>EMAIL</a>
        </div>
      </div>
    </footer>
  );
}
