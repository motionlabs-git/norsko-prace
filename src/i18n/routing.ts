import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["cs", "sk"],
  defaultLocale: "cs",
  pathnames: {
    "/": "/",
    "/prace": "/prace",
    "/prace/[slug]": "/prace/[slug]",
    "/blog": "/blog",
    "/blog/[slug]": "/blog/[slug]",
    "/pruvodce": "/pruvodce",
    "/pruvodce/[slug]": "/pruvodce/[slug]",
    "/auth/login": "/auth/login",
    "/auth/register": "/auth/register",
    "/oblibene": "/oblibene",
    "/profil": "/profil",
    "/admin": "/admin",
  },
});
