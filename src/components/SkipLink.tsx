import { useT } from "../lib/extra-copy";

/** First tab stop on the public screens: lets keyboard and screen-reader users jump past the header to <main id="main">. */
export default function SkipLink() {
  const tx = useT();
  return (
    <a
      className="skip-link"
      href="#main"
      onClick={(e) => {
        const target = document.getElementById("main");
        if (!target) return;
        e.preventDefault();
        target.focus();
        target.scrollIntoView({ block: "start" });
      }}
    >
      {tx("Skip to main content")}
    </a>
  );
}
