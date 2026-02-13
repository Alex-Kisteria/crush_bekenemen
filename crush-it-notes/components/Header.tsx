import Image from "next/image";

export default function Header() {
  return (
    <div className="absolute top-6 left-8 z-50">
      <Image
        src="Valentine's Wall.svg"
        alt="Valentine's Wall"
        width={200}
        height={50}
        priority
      />
    </div>
  );
}
