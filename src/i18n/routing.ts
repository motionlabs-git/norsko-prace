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
    "/auth/forgot-password": "/auth/forgot-password",
    "/auth/reset-password": "/auth/reset-password",
    "/oblibene": "/oblibene",
    "/profil": "/profil",
    "/admin": "/admin",
    "/vybrane": "/vybrane",
    "/ubytovani": "/ubytovani",
    "/privacy": "/privacy",
    "/terms": "/terms",
  },
});
