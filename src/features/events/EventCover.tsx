import dawn from "@/assets/hero-india-dawn.jpg";
import lotus from "@/assets/lotus-pixel.png";
import banyan from "@/assets/about-banyan.jpg";
import { cn } from "@/lib/utils";
export function EventCover({
  template,
  className,
  priority = false,
}: {
  template: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("event-cover", className)} data-template={template}>
      <img
        src={template === "lotus" ? lotus : template === "banyan" ? banyan : dawn}
        alt=""
        width={640}
        height={640}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
      <span aria-hidden="true" className="event-cover-mark">
        INDUS ORBIT
      </span>
    </div>
  );
}
