type Variant = "stars" | "blobs";

export default function Background({ variant = "stars" }: { variant?: Variant }) {
  return (
    <div
      aria-hidden="true"
      className={variant === "stars" ? "bg-stars" : "bg-blobs"}
    />
  );
}