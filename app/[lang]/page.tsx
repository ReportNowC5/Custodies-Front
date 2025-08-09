import React from "react";
import { redirect } from "next/navigation";

const page = () => {
  // Redirigir directamente al dashboard
  redirect("/dashboard");
};

export default page;
