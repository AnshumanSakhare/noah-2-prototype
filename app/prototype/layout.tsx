import type React from "react";

import "../../components/homework/homework-studio.css";
import "../../components/homework/student-studio.css";

export const metadata = {
  title: "Homework Prototype",
  description:
    "Prototype homework runner — 15 diagnostic + 5 interactive questions per topic.",
};

export default function PrototypeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="homework-studio">
      <link
        href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </div>
  );
}
