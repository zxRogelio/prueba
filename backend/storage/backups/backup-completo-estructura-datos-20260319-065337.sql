--
-- PostgreSQL database dump
--

\restrict H3hlhYivO3mOhAKkPBBwaKXY9fHJHcAwJVJieempOXO1VzClMN6mDm4hDb6fjws

-- Dumped from database version 17.8 (a284a84)
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: core; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA core;


--
-- Name: neon_auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA neon_auth;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: reports; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA reports;


--
-- Name: staging; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA staging;


--
-- Name: enum_Products_productType; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core."enum_Products_productType" AS ENUM (
    'Suplementación',
    'Ropa'
);


--
-- Name: enum_Products_status; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core."enum_Products_status" AS ENUM (
    'Activo',
    'Inactivo'
);


--
-- Name: enum_Users_authMethod; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core."enum_Users_authMethod" AS ENUM (
    'normal',
    'otp',
    'totp',
    'confirm-link'
);


--
-- Name: enum_Users_role; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core."enum_Users_role" AS ENUM (
    'cliente',
    'entrenador',
    'administrador'
);


--
-- Name: enum_Products_productType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_Products_productType" AS ENUM (
    'Suplementación',
    'Ropa'
);


--
-- Name: enum_Products_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_Products_status" AS ENUM (
    'Activo',
    'Inactivo'
);


--
-- Name: enum_Users_authMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_Users_authMethod" AS ENUM (
    'normal',
    'otp',
    'totp',
    'confirm-link'
);


--
-- Name: enum_Users_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_Users_role" AS ENUM (
    'cliente',
    'entrenador',
    'administrador'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Brands; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core."Brands" (
    id integer NOT NULL,
    id_marca integer NOT NULL,
    name character varying(120) NOT NULL,
    active boolean DEFAULT true,
    "categoryId" integer,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: Brands_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core."Brands_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Brands_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: -
--

ALTER SEQUENCE core."Brands_id_seq" OWNED BY core."Brands".id;


--
-- Name: Categories; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core."Categories" (
    id integer NOT NULL,
    id_categoria integer NOT NULL,
    name character varying(120) NOT NULL,
    active boolean DEFAULT true,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: Categories_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core."Categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Categories_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: -
--

ALTER SEQUENCE core."Categories_id_seq" OWNED BY core."Categories".id;


--
-- Name: products_id_producto_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core.products_id_producto_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Products; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core."Products" (
    id integer NOT NULL,
    id_producto integer DEFAULT nextval('core.products_id_producto_seq'::regclass) NOT NULL,
    name character varying(160) NOT NULL,
    "brandId" integer NOT NULL,
    "categoryId" integer NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    status public."enum_Products_status" DEFAULT 'Activo'::public."enum_Products_status" NOT NULL,
    "imageUrl" character varying(500),
    "productType" public."enum_Products_productType" NOT NULL,
    description text,
    features text,
    "supplementFlavor" character varying(120),
    "supplementPresentation" character varying(120),
    "supplementServings" character varying(120),
    "apparelSize" character varying(50),
    "apparelColor" character varying(80),
    "apparelMaterial" character varying(120),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: Products_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core."Products_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Products_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: -
--

ALTER SEQUENCE core."Products_id_seq" OWNED BY core."Products".id;


--
-- Name: Users; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core."Users" (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255),
    otp character varying(255),
    "otpExpires" timestamp with time zone,
    "isVerified" boolean DEFAULT false,
    "isPendingApproval" boolean DEFAULT false,
    "accessToken" character varying(255) DEFAULT NULL::character varying,
    "totpSecret" character varying(255) DEFAULT NULL::character varying,
    "authMethod" public."enum_Users_authMethod" DEFAULT 'normal'::public."enum_Users_authMethod",
    role public."enum_Users_role" DEFAULT 'cliente'::public."enum_Users_role",
    provider character varying(255) DEFAULT 'local'::character varying NOT NULL,
    "providerId" character varying(255),
    "passwordChangesCount" integer DEFAULT 0,
    "passwordChangesDate" date,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: product_images; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.product_images (
    id integer NOT NULL,
    "productId" integer NOT NULL,
    url character varying(2048) NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "publicId" character varying(500),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: product_images_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core.product_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_images_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: -
--

ALTER SEQUENCE core.product_images_id_seq OWNED BY core.product_images.id;


--
-- Name: sessions; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.sessions (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    revoked boolean DEFAULT false,
    "userAgent" character varying(255),
    "ipAddress" character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: account; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" uuid NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: invitation; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.invitation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    email text NOT NULL,
    role text,
    status text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "inviterId" uuid NOT NULL
);


--
-- Name: jwks; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.jwks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicKey" text NOT NULL,
    "privateKey" text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "expiresAt" timestamp with time zone
);


--
-- Name: member; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.member (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    role text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL
);


--
-- Name: organization; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.organization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo text,
    "createdAt" timestamp with time zone NOT NULL,
    metadata text
);


--
-- Name: project_config; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.project_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    endpoint_id text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    trusted_origins jsonb NOT NULL,
    social_providers jsonb NOT NULL,
    email_provider jsonb,
    email_and_password jsonb,
    allow_localhost boolean NOT NULL,
    plugin_configs jsonb,
    webhook_config jsonb
);


--
-- Name: session; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" uuid NOT NULL,
    "impersonatedBy" text,
    "activeOrganizationId" text
);


--
-- Name: user; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth."user" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role text,
    banned boolean,
    "banReason" text,
    "banExpires" timestamp with time zone
);


--
-- Name: verification; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.verification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: import_errors; Type: TABLE; Schema: staging; Owner: -
--

CREATE TABLE staging.import_errors (
    error_id bigint NOT NULL,
    batch_id uuid NOT NULL,
    row_num integer NOT NULL,
    field_name text,
    error_message text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: import_errors_error_id_seq; Type: SEQUENCE; Schema: staging; Owner: -
--

CREATE SEQUENCE staging.import_errors_error_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_errors_error_id_seq; Type: SEQUENCE OWNED BY; Schema: staging; Owner: -
--

ALTER SEQUENCE staging.import_errors_error_id_seq OWNED BY staging.import_errors.error_id;


--
-- Name: products_import; Type: TABLE; Schema: staging; Owner: -
--

CREATE TABLE staging.products_import (
    import_id bigint NOT NULL,
    batch_id uuid NOT NULL,
    row_num integer NOT NULL,
    id_producto integer,
    name text,
    "brandId" integer,
    "categoryId" integer,
    price numeric(10,2),
    stock integer,
    status text,
    "productType" text,
    "imageUrl" text,
    description text,
    features text,
    "supplementFlavor" text,
    "supplementPresentation" text,
    "supplementServings" text,
    "apparelSize" text,
    "apparelColor" text,
    "apparelMaterial" text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: products_import_import_id_seq; Type: SEQUENCE; Schema: staging; Owner: -
--

CREATE SEQUENCE staging.products_import_import_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_import_import_id_seq; Type: SEQUENCE OWNED BY; Schema: staging; Owner: -
--

ALTER SEQUENCE staging.products_import_import_id_seq OWNED BY staging.products_import.import_id;


--
-- Name: Brands id; Type: DEFAULT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Brands" ALTER COLUMN id SET DEFAULT nextval('core."Brands_id_seq"'::regclass);


--
-- Name: Categories id; Type: DEFAULT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Categories" ALTER COLUMN id SET DEFAULT nextval('core."Categories_id_seq"'::regclass);


--
-- Name: Products id; Type: DEFAULT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Products" ALTER COLUMN id SET DEFAULT nextval('core."Products_id_seq"'::regclass);


--
-- Name: product_images id; Type: DEFAULT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product_images ALTER COLUMN id SET DEFAULT nextval('core.product_images_id_seq'::regclass);


--
-- Name: import_errors error_id; Type: DEFAULT; Schema: staging; Owner: -
--

ALTER TABLE ONLY staging.import_errors ALTER COLUMN error_id SET DEFAULT nextval('staging.import_errors_error_id_seq'::regclass);


--
-- Name: products_import import_id; Type: DEFAULT; Schema: staging; Owner: -
--

ALTER TABLE ONLY staging.products_import ALTER COLUMN import_id SET DEFAULT nextval('staging.products_import_import_id_seq'::regclass);


--
-- Data for Name: Brands; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."Brands" (id, id_marca, name, active, "categoryId", "createdAt", "updatedAt") FROM stdin;
1	1	Optimum Nutrition	t	1	2026-03-04 05:13:32.472+00	2026-03-04 05:13:32.472+00
2	2	Adidas	t	2	2026-03-04 05:15:33.025+00	2026-03-05 12:23:12.323+00
3	3	Nike	t	2	2026-03-05 14:09:21.81+00	2026-03-05 14:09:21.81+00
4	4	Under	t	3	2026-03-05 14:10:36.657+00	2026-03-05 14:10:36.657+00
6	6	Youngla	t	3	2026-03-12 17:46:15.531+00	2026-03-12 17:46:15.531+00
5	5	Gym Shark	t	3	2026-03-12 10:09:37.311+00	2026-03-12 17:46:23.409+00
7	7	Alo	t	3	2026-03-12 17:46:47.809+00	2026-03-12 17:46:47.809+00
8	8	Reebok	t	4	2026-03-12 22:11:18.375+00	2026-03-12 22:11:18.375+00
9	9	Life Fitness	t	4	2026-03-12 22:11:33.131+00	2026-03-12 22:11:33.131+00
11	11	Nike2	t	5	2026-03-16 23:33:16.657+00	2026-03-16 23:33:16.657+00
10	10	Nke	f	4	2026-03-12 22:15:04.985+00	2026-03-16 23:33:22.275+00
\.


--
-- Data for Name: Categories; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."Categories" (id, id_categoria, name, active, "createdAt", "updatedAt") FROM stdin;
1	1	Proteinas	t	2026-03-04 05:12:43.589+00	2026-03-04 05:12:53.679+00
2	2	Tennis	t	2026-03-04 05:15:25.573+00	2026-03-04 05:15:25.573+00
3	3	Ropa	t	2026-03-05 14:09:45.014+00	2026-03-05 14:09:45.014+00
4	4	Accesorios	t	2026-03-12 09:39:35.049+00	2026-03-12 09:39:35.049+00
5	5	Tennis Deportivos	t	2026-03-16 23:32:35.232+00	2026-03-16 23:32:48.004+00
\.


--
-- Data for Name: Products; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."Products" (id, id_producto, name, "brandId", "categoryId", price, stock, status, "imageUrl", "productType", description, features, "supplementFlavor", "supplementPresentation", "supplementServings", "apparelSize", "apparelColor", "apparelMaterial", "createdAt", "updatedAt") FROM stdin;
12	12	Tennis Adidas Boost Naranja	2	2	1400.00	4	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773308490/titanium/products/opbjhb5pypz7d66fcr3v.jpg	Ropa	Tennis	[]	\N	\N	\N	EG	Naranja	Textil	2026-03-12 05:21:21.945547+00	2026-03-12 09:41:31.25+00
1	1	Tennis	2	2	1000.00	10	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1772602231/titanium/products/pe39pj4psnprwulhvqro.jpg	Ropa	Tennis	["Running"]	\N	\N	\N	M	Negro	Algodon	2026-03-04 05:30:31.715+00	2026-03-05 06:19:42.205+00
2	2	Whey Protein	1	1	2000.00	2	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1772692724/titanium/products/sbpylh7wtrujjfakhts7.jpg	Suplementación	Una proteina que te hace Holk	[]	Chocolate	1 kg	50	\N	\N	\N	2026-03-05 06:38:45.807+00	2026-03-05 06:38:45.807+00
3	3	Playera de compresion	4	3	1000.00	3	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1772720005/titanium/products/svcbtdo2kqoyhkdjv4yt.jpg	Ropa	Una playera para verte mas fuerte	[]	\N	\N	\N	M	Negro	Algodon	2026-03-05 14:13:26.618+00	2026-03-05 14:13:26.618+00
5	5	Tennis Adidas Runner Blanco	2	2	1150.00	8	Activo	\N	Ropa	Tennis	[]	\N	\N	\N	M	Blanco	Textil	2026-03-12 05:21:21.945547+00	2026-03-12 05:21:21.945547+00
6	6	Tennis Adidas Street Azul	2	2	1200.00	12	Activo	\N	Ropa	Tennis	[]	\N	\N	\N	G	Azul	Sintetico	2026-03-12 05:21:21.945547+00	2026-03-12 05:21:21.945547+00
7	7	Tennis Adidas Urban Gris	2	2	980.00	6	Activo	\N	Ropa	Tennis	[]	\N	\N	\N	CH	Gris	Algodon	2026-03-12 05:21:21.945547+00	2026-03-12 05:21:21.945547+00
8	8	Tennis Adidas Pro Rojo	2	2	1350.00	7	Activo	\N	Ropa	Tennis	[]	\N	\N	\N	M	Rojo	Sintetico	2026-03-12 05:21:21.945547+00	2026-03-12 05:21:21.945547+00
10	10	Tennis Adidas Max Verde	2	2	1250.00	5	Activo	\N	Ropa	Tennis	[]	\N	\N	\N	G	Verde	Sintetico	2026-03-12 05:21:21.945547+00	2026-03-12 05:21:21.945547+00
85	15	Cinturón de levantamiento Reebok	8	4	650.00	5	Activo	\N	Ropa	Cinturón de gimnasio diseñado para proteger la zona lumbar durante ejercicios de fuerza como peso muerto o sentadilla	["Soporte lumbar reforzado"]	\N	\N	\N	M / G	Negro / Rojo	Cuero sintético	2026-03-12 22:14:08.377+00	2026-03-12 22:14:08.377+00
86	16	Guantes de entrenamiento Nike	10	4	420.00	10	Activo	\N	Ropa	Guantes deportivos que mejoran el agarre y protegen las manos durante el levantamiento de pesas.	["Antideslizantes y transpirables"]	\N	\N	\N	CH / M / G	Negro	Poliéster / Spandex	2026-03-12 22:16:59.406+00	2026-03-12 22:16:59.406+00
87	17	Tennis Prueba	11	5	1500.00	100	Activo	\N	Ropa	Prueba	[]	\N	\N	\N	M	Azul	Algodon	2026-03-16 23:33:59.63+00	2026-03-16 23:33:59.63+00
4	4	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773308505/titanium/products/gijycqnyokjl4almgx0f.jpg	Ropa	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 05:21:21.945547+00	2026-03-12 09:41:45.813+00
11	11	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773310154/titanium/products/anb6jws0dpedg7lsjdee.jpg	Ropa	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 05:21:21.945547+00	2026-03-12 10:09:15.026+00
46	14	Sudadera Alo	7	3	1110.00	10	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773337807/titanium/products/yr00hgjzp2bslrcnaid3.jpg	Ropa	Sudadera comoda	["Comodo","Fresco"]	\N	\N	\N	M	Negro	Poliester	2026-03-12 17:50:08.201+00	2026-03-12 17:50:08.201+00
13	13	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773351955/titanium/products/zt0vkaawatodqdlwh0jr.jpg	Ropa	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 05:21:21.945547+00	2026-03-12 21:45:57.134+00
9	9	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773351971/titanium/products/rhqu3nqb2oxbjjjxjs7d.jpg	Ropa	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 05:21:21.945547+00	2026-03-12 21:46:11.862+00
\.


--
-- Data for Name: Users; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."Users" (id, email, password, otp, "otpExpires", "isVerified", "isPendingApproval", "accessToken", "totpSecret", "authMethod", role, provider, "providerId", "passwordChangesCount", "passwordChangesDate", "createdAt", "updatedAt") FROM stdin;
e2b8251c-a695-40d9-aafc-5cd838525c53	admin@titanium.com	$2b$10$m1NFF4wNJ/gTrXzz2Cw3telkpHFBFsfTFeHJplMR07157oSQJcTJy	\N	\N	t	f	\N	\N	normal	administrador	local	\N	0	\N	2026-03-04 05:02:30.840499+00	2026-03-04 05:02:30.840499+00
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.product_images (id, "productId", url, "order", "publicId", "createdAt", "updatedAt", active) FROM stdin;
1	1	https://res.cloudinary.com/dqf9pdcte/image/upload/v1772602231/titanium/products/pe39pj4psnprwulhvqro.jpg	0	titanium/products/pe39pj4psnprwulhvqro	2026-03-04 05:30:31.812+00	2026-03-04 05:30:31.812+00	t
2	1	https://res.cloudinary.com/dqf9pdcte/image/upload/v1772691566/titanium/products/qqxdn5mtfonogqhag69u.jpg	1	titanium/products/qqxdn5mtfonogqhag69u	2026-03-05 06:19:27.012+00	2026-03-05 06:19:27.012+00	t
3	1	https://res.cloudinary.com/dqf9pdcte/image/upload/v1772691580/titanium/products/gbdimuacqyroqjfgvktx.jpg	2	titanium/products/gbdimuacqyroqjfgvktx	2026-03-05 06:19:42.116+00	2026-03-05 06:19:42.116+00	t
4	1	https://res.cloudinary.com/dqf9pdcte/image/upload/v1772691581/titanium/products/zhmcihprdlyurgavzyfe.jpg	3	titanium/products/zhmcihprdlyurgavzyfe	2026-03-05 06:19:42.116+00	2026-03-05 06:19:42.116+00	t
5	2	https://res.cloudinary.com/dqf9pdcte/image/upload/v1772692724/titanium/products/sbpylh7wtrujjfakhts7.jpg	0	titanium/products/sbpylh7wtrujjfakhts7	2026-03-05 06:38:45.895+00	2026-03-05 06:38:45.895+00	t
6	3	https://res.cloudinary.com/dqf9pdcte/image/upload/v1772720005/titanium/products/svcbtdo2kqoyhkdjv4yt.jpg	0	titanium/products/svcbtdo2kqoyhkdjv4yt	2026-03-05 14:13:26.722+00	2026-03-05 14:13:26.722+00	t
7	12	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773308490/titanium/products/opbjhb5pypz7d66fcr3v.jpg	0	titanium/products/opbjhb5pypz7d66fcr3v	2026-03-12 09:41:31.166+00	2026-03-12 09:41:31.166+00	t
8	4	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773308505/titanium/products/gijycqnyokjl4almgx0f.jpg	0	titanium/products/gijycqnyokjl4almgx0f	2026-03-12 09:41:45.729+00	2026-03-12 09:41:45.729+00	t
9	11	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773310154/titanium/products/anb6jws0dpedg7lsjdee.jpg	0	titanium/products/anb6jws0dpedg7lsjdee	2026-03-12 10:09:14.874+00	2026-03-12 10:09:14.874+00	t
10	14	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773337807/titanium/products/yr00hgjzp2bslrcnaid3.jpg	0	titanium/products/yr00hgjzp2bslrcnaid3	2026-03-12 17:50:08.293+00	2026-03-12 17:50:08.293+00	t
11	13	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773351955/titanium/products/zt0vkaawatodqdlwh0jr.jpg	0	titanium/products/zt0vkaawatodqdlwh0jr	2026-03-12 21:45:55.324+00	2026-03-12 21:45:55.324+00	t
12	13	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773351956/titanium/products/vmfbs1n0h8vwzp54y80q.jpg	1	titanium/products/vmfbs1n0h8vwzp54y80q	2026-03-12 21:45:56.997+00	2026-03-12 21:45:56.997+00	t
13	9	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773351971/titanium/products/rhqu3nqb2oxbjjjxjs7d.jpg	0	titanium/products/rhqu3nqb2oxbjjjxjs7d	2026-03-12 21:46:11.74+00	2026-03-12 21:46:11.74+00	t
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core.sessions (id, "userId", token, "expiresAt", revoked, "userAgent", "ipAddress", "createdAt", "updatedAt") FROM stdin;
9dc9e13c-8fa1-491f-9835-0f949e854537	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNjAxMDc0LCJleHAiOjE3NzI2MDQ2NzR9.-aYiYN064Rwm5nWTofRBWKw2Pw4RSq0wDbjScjNEJgc	2026-03-04 06:11:14.158+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-04 05:11:14.159+00	2026-03-04 05:11:14.159+00
781c6268-9cdb-43df-8eb3-3227aa0cbb42	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNjg1MTYxLCJleHAiOjE3NzI2ODg3NjF9.0fRMvbXIISTLjp67Q5vVlpIgObjJ6BAMiIkSLHfGYZY	2026-03-05 05:32:41.698+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 04:32:41.701+00	2026-03-05 04:32:41.701+00
babde16c-e10d-47fb-b06b-94c780dbc000	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNjg2NDEyLCJleHAiOjE3NzI2OTAwMTJ9.Mog9ZeUiJHyyKWIsqmuGYbMdmjlkg7ydNkdokt5JXkQ	2026-03-05 05:53:32.035+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 04:53:32.037+00	2026-03-05 04:53:32.037+00
3ce6ab2b-b914-4677-bf6c-361bd19e6c51	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNjkxMzQwLCJleHAiOjE3NzI2OTQ5NDB9.r46gXK_RfRLKVHeSI0mz98LIois5XtEuguc2n2nW0k4	2026-03-05 07:15:40.758+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 06:15:40.76+00	2026-03-05 06:15:40.76+00
ec1fd8a7-ad6f-4356-91b1-163630b175d7	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNjkyNDMwLCJleHAiOjE3NzI2OTYwMzB9.md1F4rvS7N91hjPfBbBJWjZOWl_4ocTfDyJpk689M54	2026-03-05 07:33:50.957+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 06:33:50.958+00	2026-03-05 06:33:50.958+00
1b66fa06-6b71-4ae5-8b1a-af77044bede8	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNzAxMzIwLCJleHAiOjE3NzI3MDQ5MjB9.FvW8wvilyCCgAIN9qUCMqAd7I0lQ-CBNRqtjS-T2_lk	2026-03-05 10:02:00.753+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 09:02:00.754+00	2026-03-05 09:02:00.754+00
0bccd439-0d4f-4469-8427-cfe6556162a4	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNzEwNjE4LCJleHAiOjE3NzI3MTQyMTh9._RQlDLmsbEIyceXc-4Mc1AKJ6tzUL-jIxRLTXL3Z7KM	2026-03-05 12:36:58.99+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 11:36:58.99+00	2026-03-05 11:36:58.99+00
012e20e9-751f-48ae-be28-0c5d022d7ec1	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNzEyNjY1LCJleHAiOjE3NzI3MTYyNjV9.S6-YxgVLcfXqeNwpvzlYh3-g_wnpMFe2aRBnQbf7VPY	2026-03-05 13:11:05.986+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 12:11:05.987+00	2026-03-05 12:11:05.987+00
0c5a6fe8-e79f-47c4-aed2-9dd032b50bad	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNzEzNTQ0LCJleHAiOjE3NzI3MTcxNDR9.F07ZozAjhpnsl2yhNJ7hSoRtQp6mUhgyyNWM-F3qwJc	2026-03-05 13:25:44.85+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 12:25:44.85+00	2026-03-05 12:25:44.85+00
0bc3b94c-8a85-43c3-9ea1-32eb488aec04	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNzEzNjUwLCJleHAiOjE3NzI3MTcyNTB9.ErIznP_QnfAE5jhD4dx58dGx-S6o-wkewIyPHZXkndQ	2026-03-05 13:27:30.495+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 12:27:30.495+00	2026-03-05 12:27:30.495+00
823ff042-a5f7-45a4-b9ae-aacc4912b3f3	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNzEzODA4LCJleHAiOjE3NzI3MTc0MDh9.NiRjJNppJBrPFdHdhf3YJF2CgK6rh0aY6eYJqyJ3ZDo	2026-03-05 13:30:08.648+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 12:30:08.649+00	2026-03-05 12:30:08.649+00
ccb89b2d-65f9-42b5-adf7-0a09c5690d6e	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNzE0MTc3LCJleHAiOjE3NzI3MTc3Nzd9.sAg0KJk2IIu-58sj98I3dhtRpZLtYKtUNu-OQfdJWr0	2026-03-05 13:36:17.053+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 12:36:17.053+00	2026-03-05 12:36:17.053+00
7dcafc63-e28d-40eb-b9c7-86df5c58864d	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNzE0NTUxLCJleHAiOjE3NzI3MTgxNTF9.FCmjine9XHmCdjvsT8Ga_3BkzYBJJYXZ4eVb3B5oHmw	2026-03-05 13:42:31.962+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 12:42:31.962+00	2026-03-05 12:42:31.962+00
edda9ca4-dce8-4447-a87d-8abbf24324ea	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNzE0NTU2LCJleHAiOjE3NzI3MTgxNTZ9.acJ1FDv8UEPg6CSkVuLqTrSyr1yKBAXLFwa4bUZZKhc	2026-03-05 13:42:36.587+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 12:42:36.587+00	2026-03-05 12:42:36.587+00
4c81d29f-8456-45d5-9bfa-2835915ee4bd	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNzE5NzQ4LCJleHAiOjE3NzI3MjMzNDh9.NEI5MrriAY0cg8V6SB_pgq-aXqrYB1DwrdiVFAIGu4A	2026-03-05 15:09:08.145+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-05 14:09:08.145+00	2026-03-05 14:09:08.145+00
ee193ca9-f02d-4c4b-97ca-820ea32cb192	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNzI4OTM2LCJleHAiOjE3NzI3MzI1MzZ9.pZ1NI6OeOUKSOvN-xDijccWDvfOg8T3ZVCHN8dlunTw	2026-03-05 17:42:16.911+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0	::1	2026-03-05 16:42:16.913+00	2026-03-05 16:42:16.913+00
a1338a48-fd93-4ac7-b0c1-adbc388c7db6	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNzU2NzQzLCJleHAiOjE3NzI3NjAzNDN9.SQRuTmV4-DlI39kT4t2EEmxAfA_VGCod5fq5FegEtKs	2026-03-06 01:25:43.621+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-06 00:25:43.623+00	2026-03-06 00:25:43.623+00
a24e02d3-995f-4a62-821d-9c7e2818b6a7	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyNzU3NzUxLCJleHAiOjE3NzI3NjEzNTF9.yhhKI-GD12TOJ7a4CxgvXBeWer8wJSqLK_ORLJEWn9Y	2026-03-06 01:42:31.559+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-06 00:42:31.56+00	2026-03-06 00:42:31.56+00
7c8d981b-0824-4c6d-9fd7-b5f1cf91b81f	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzcyOTM5ODgxLCJleHAiOjE3NzI5NDM0ODF9.ra1ynPCIfwEIhxVSLWLVWl84SQsUGQj2uZsTs368syY	2026-03-08 04:18:01.689+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-08 03:18:01.691+00	2026-03-08 03:18:01.691+00
cabcc14c-4e5d-477e-979d-0e08490f87b2	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMDEzNDk2LCJleHAiOjE3NzMwMTcwOTZ9.X9SLJ5jBhVslbHj9SzQyVck3WPFp4oAuzl1NB_qav_I	2026-03-09 00:44:56.515+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-08 23:44:56.518+00	2026-03-08 23:44:56.518+00
b859018c-25b5-41c0-9675-312116860fc8	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMTg0NzMxLCJleHAiOjE3NzMxODgzMzF9.meSaHdTc1MDFnK5EPkG1hWledxGuFGeCk2g_lggtH0Y	2026-03-11 00:18:51.269+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-10 23:18:51.271+00	2026-03-10 23:18:51.271+00
156b5f83-e2bc-4f1c-adc7-988806d59b7f	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMTg2ODIxLCJleHAiOjE3NzMxOTA0MjF9.gL3AiLc8HJliwQ0LtBwJjerb7GNmJFsScQ6JUi5OHJQ	2026-03-11 00:53:41.655+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-10 23:53:41.658+00	2026-03-10 23:53:41.658+00
4c49cbf2-bb6f-43c2-97a8-ba61623835e7	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMjkwMDY5LCJleHAiOjE3NzMyOTM2Njl9.gQfZTWMkzr7ih4eDcQhXhIW_LkY8MTuiaVBgKTDOLo4	2026-03-12 05:34:29.091+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 04:34:29.093+00	2026-03-12 04:34:29.093+00
f63925d8-502d-4ada-9fd3-c8d5ac822a9f	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMjk1MzU1LCJleHAiOjE3NzMyOTg5NTV9.JGeCu4c8C3V-4_CC7h8Qrb0HlACIF4VXijYiy5YDvrE	2026-03-12 07:02:35.072+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 06:02:35.073+00	2026-03-12 06:02:35.073+00
0f1141e6-3548-48c8-baae-35812320b6e1	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMjk2OTMyLCJleHAiOjE3NzMzMDA1MzJ9.gA-rUHvNGbDWZtZLDAeJAdz41V5v0M0a5ihcaq7GnuY	2026-03-12 07:28:52.247+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 06:28:52.248+00	2026-03-12 06:28:52.248+00
157fe5b8-954b-4fa1-88a3-2f4340e1ce8d	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMjk3MDcwLCJleHAiOjE3NzMzMDA2NzB9.gJH7mmCXCnkI1MfKf6P-9q0aggHmxOumgFwkMy7ey-c	2026-03-12 07:31:10.933+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 06:31:10.934+00	2026-03-12 06:31:10.934+00
9113fd76-76e1-4b20-b892-741d1a22df1e	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMjk3NDU2LCJleHAiOjE3NzMzMDEwNTZ9.LeXhgBzCWMorSYNhkRFiFGVKVDhG8_1XEWBpf1L0xXc	2026-03-12 07:37:36.681+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 06:37:36.682+00	2026-03-12 06:37:36.682+00
c6fdcf6c-9197-4b62-ad79-87ee4192c0c1	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMjk5MDg2LCJleHAiOjE3NzMzMDI2ODZ9.uMe5SiknBkhngLft6vJsGXFZsN7xDRNnj-YYmcK4cKg	2026-03-12 08:04:46.204+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 07:04:46.205+00	2026-03-12 07:04:46.205+00
08e7a701-fad1-4d9f-9b9b-d4c88d49269c	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzAxNjIwLCJleHAiOjE3NzMzMDUyMjB9.2eqW8aruL9uqGL3XL4l3chdomeMj2frZ7b8SgIja5YU	2026-03-12 08:47:00.674+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 07:47:00.675+00	2026-03-12 07:47:00.675+00
f1591ae8-ce8d-47f9-8e16-497c999d705d	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzAzOTY4LCJleHAiOjE3NzMzMDc1Njh9.2-NXD15unCZzw0A31MHSY3GyOmSagFlVBdZBqQ7D_Gg	2026-03-12 09:26:08.696+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 08:26:08.697+00	2026-03-12 08:26:08.697+00
8a7fbf6e-bf00-48e7-822a-fd093f4214d4	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzA0NjgwLCJleHAiOjE3NzMzMDgyODB9.SxIZ9GsmeMB0MfPIz3asZ5DDdfVrRGcM9-2q8cmnJ-o	2026-03-12 09:38:00.603+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 08:38:00.603+00	2026-03-12 08:38:00.603+00
76a0b6d5-fdf7-4205-a8a6-ba7d48c7f986	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzA4MzU1LCJleHAiOjE3NzMzMTE5NTV9.0qATkfwZtG081COguHGgidPcFY0FtCh4URZCv-9PieU	2026-03-12 10:39:15.667+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 09:39:15.668+00	2026-03-12 09:39:15.668+00
60ff1cbf-3d98-4f2e-88df-a27191939199	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzA4NTYwLCJleHAiOjE3NzMzMTIxNjB9.j5Aoh5NSxaoI6xqpoZqoANq8nb2KTap14Adp6OuNl6U	2026-03-12 10:42:40.299+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 09:42:40.299+00	2026-03-12 09:42:40.299+00
fd3e1a16-d045-4f2e-a3a2-16db406d4105	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzA4NzE3LCJleHAiOjE3NzMzMTIzMTd9.-ZVbHveWGhFB_V1Dv5ZiBuDKViRSCYzhQj8d0eUaGuM	2026-03-12 10:45:17.115+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 09:45:17.116+00	2026-03-12 09:45:17.116+00
8afac22a-53ee-43a8-94e7-e1f446e3e808	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzA5NjY5LCJleHAiOjE3NzMzMTMyNjl9.VOoAfxD4uBMcCRVpemPYBtQlLx6hgl_ebmU09dPJGZM	2026-03-12 11:01:09.635+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 10:01:09.636+00	2026-03-12 10:01:09.636+00
58c99b7e-dcad-4531-8793-c8d08e471649	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzA5NzQ3LCJleHAiOjE3NzMzMTMzNDd9.47V61L7x3f4C-CzA7Csh9HEh0WGV1qlw8ODrukqyTEI	2026-03-12 11:02:27.477+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 10:02:27.477+00	2026-03-12 10:02:27.477+00
36d83989-9b2a-4d8a-b502-cb8b95a72911	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzA5ODQ3LCJleHAiOjE3NzMzMTM0NDd9.esGog23Mo2h_kPEk1h-y87awZ3N6nuJ0dbM2QZ14ipo	2026-03-12 11:04:07.776+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 10:04:07.777+00	2026-03-12 10:04:07.777+00
4fd3c866-5b0d-4b31-ac4b-702fabfdce9c	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzEwMTE0LCJleHAiOjE3NzMzMTM3MTR9.693l018MOM9oicZayWgn-FoT_9LMHSCylcnUWGvAExM	2026-03-12 11:08:34.744+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 10:08:34.745+00	2026-03-12 10:08:34.745+00
b3affb75-84f7-4503-830d-6e034637437a	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzEwMzY2LCJleHAiOjE3NzMzMTM5NjZ9.nB1j-O1Md708epSSCZU93rDE1K2TjK3hvZKO7uBLcAc	2026-03-12 11:12:46.907+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 10:12:46.908+00	2026-03-12 10:12:46.908+00
bbb0b74d-82f8-402c-b7fb-2a6fb0b849e0	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzM1NTA1LCJleHAiOjE3NzMzMzkxMDV9.zk-C9lPvQ77KLplOHCHUh5a6-SR85dWOQi088XLuWeQ	2026-03-12 18:11:45.07+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 17:11:45.082+00	2026-03-12 17:11:45.082+00
4a398eb0-f5e7-46ce-8d50-f7b866bcd15f	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzM5NDQzLCJleHAiOjE3NzMzNDMwNDN9.IiY4YceTcdNR13stZc0Lkf8xE0H1FldSt_56tPjskN0	2026-03-12 19:17:23.925+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 18:17:23.928+00	2026-03-12 18:17:23.928+00
da549af6-f68b-4a14-8794-373892d01014	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzQ3NjcwLCJleHAiOjE3NzMzNTEyNzB9.u1CpNk6eK8C9oQtw0kWdhmmfhQOBfIyZ28I4r_JG5tw	2026-03-12 21:34:30.271+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 20:34:30.273+00	2026-03-12 20:34:30.273+00
cda40ac7-1c16-457b-af83-294490163391	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzUxMTg3LCJleHAiOjE3NzMzNTQ3ODd9.SLqQu--8FoBJyD1IqMci6xMu7UMVzKz_m0m3p-5nCk0	2026-03-12 22:33:07.051+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 21:33:07.053+00	2026-03-12 21:33:07.053+00
399e79e4-e892-43a8-9934-af33286b08ad	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczMzU5NTU5LCJleHAiOjE3NzMzNjMxNTl9.2_wNJzFWtxV5pbVJlnaQCcNolt6qL_e_arqSkNQ2ohg	2026-03-13 00:52:39.766+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-12 23:52:39.769+00	2026-03-12 23:52:39.769+00
aaf4b17b-65e2-4c1a-a118-23082b40c795	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczNjMyNTI1LCJleHAiOjE3NzM2MzYxMjV9.cFHlUNMzoo625TLwpmw2u_zAw0SrrHn76Mo7gxpDLKA	2026-03-16 04:42:05.924+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-16 03:42:05.927+00	2026-03-16 03:42:05.927+00
fb544fc4-0b83-4bd4-a30d-72e8d30d367e	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczNzAyMjcyLCJleHAiOjE3NzM3MDU4NzJ9.U13NYXY0iGYwklchfeSznViBxO02Wm6pw_yTZC2EV7I	2026-03-17 00:04:32.211+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0	::1	2026-03-16 23:04:32.214+00	2026-03-16 23:04:32.214+00
53f2f6fe-9adc-41e1-b961-f9d20e11e750	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczNzAzMzA3LCJleHAiOjE3NzM3MDY5MDd9.GZ9pbpnd3KwB3E4NkCE9rNq0dSr6OgYljv1AQY2HX3Q	2026-03-17 00:21:47.016+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	::1	2026-03-16 23:21:47.017+00	2026-03-16 23:21:47.017+00
4d8dd8b0-0c15-4afd-ad94-bf562fea3979	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczNzAzNjI3LCJleHAiOjE3NzM3MDcyMjd9.13xYnCtnxG8cjV1__oMxpoP6bbttgFOjyfoz4-4pUMM	2026-03-17 00:27:07.586+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0	::ffff:127.0.0.1	2026-03-16 23:27:07.587+00	2026-03-16 23:27:07.587+00
4f7738a4-3fa0-4e17-95c4-7ff178d53b7e	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczNzAzOTQzLCJleHAiOjE3NzM3MDc1NDN9.aPdUkzKSmy5n8QHIEZiTd7d460uUPWBOpnG8NBfKDQg	2026-03-17 00:32:23.986+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0	::ffff:127.0.0.1	2026-03-16 23:32:23.986+00	2026-03-16 23:32:23.986+00
e7b2767b-3a58-4a1b-ab26-9d2c852559b7	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczODE1MjQ2LCJleHAiOjE3NzM4MTg4NDZ9.2Fc0TxAjmIVmKRIrMn9Lyrt6_Mxq-jIl7-7C7Uz5V9c	2026-03-18 07:27:26.144+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-18 06:27:26.147+00	2026-03-18 06:27:26.147+00
57a4ae41-0856-4040-8259-1deaee8f3091	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczODE2MTE5LCJleHAiOjE3NzM4MTk3MTl9.mBXxpL6GrLIVV00IPaKCeSH5o6pBfpLXD6HVDvtjoH8	2026-03-18 07:41:59.741+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-18 06:41:59.744+00	2026-03-18 06:41:59.744+00
5e3f6918-3101-4776-ae21-8c8fbeca0715	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczODE4NjA1LCJleHAiOjE3NzM4MjIyMDV9.Dgnrj3-eEYlsZOnQujddk0N83Ar0t96Qtzkh1NCQWNg	2026-03-18 08:23:25.378+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-18 07:23:25.379+00	2026-03-18 07:23:25.379+00
d0093e58-ca94-4a23-8462-66602d7bac24	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczODI0Mjk0LCJleHAiOjE3NzM4Mjc4OTR9.rnGkq5PuhNOuakz5rS5vdj2_dQ6zOOrz4QqXS1_iCbo	2026-03-18 09:58:14.441+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-18 08:58:14.443+00	2026-03-18 08:58:14.443+00
1de361c2-c5e8-40aa-aaee-110764cfc44d	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczODczOTY0LCJleHAiOjE3NzM4Nzc1NjR9.nOYaUW8qWJso55ymab1zERSJLGNXuUSVFM5sN1Yxwwk	2026-03-18 23:46:04.461+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-18 22:46:04.463+00	2026-03-18 22:46:04.463+00
3c053191-9490-4dcb-978a-8a64314baaa8	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczODg2ODg0LCJleHAiOjE3NzM4OTA0ODR9.bnH8xJDtGP_Pv5FNRsb0dKFkE7MzYE9M2KBl4osEgak	2026-03-19 03:21:24.494+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 02:21:24.496+00	2026-03-19 02:21:24.496+00
0bd70bb7-a9cb-48af-a1aa-3d9f3fd6dc2b	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczODg3ODM4LCJleHAiOjE3NzM4OTE0Mzh9.Vq_u30nWZpsPJOEJoxJUQU1PkH37vvH1Sr-S0CXaK0Q	2026-03-19 03:37:18.457+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 02:37:18.46+00	2026-03-19 02:37:18.46+00
28f1743a-684a-4baf-bbc2-698e3f3d9310	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczODk3Nzc2LCJleHAiOjE3NzM5MDEzNzZ9.y9m_G8kTlTNeR7Ajuv6P7IAISHxvUGCtk9wepPD7DRY	2026-03-19 06:22:56.556+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 05:22:56.557+00	2026-03-19 05:22:56.557+00
bec649f4-1dd9-4ac4-9a76-450bc50854e4	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczODk5MzIxLCJleHAiOjE3NzM5MDI5MjF9.zKk93L8JHlCofqRnhKWEHKIT9TD7G1TfkYBzaywmOpA	2026-03-19 06:48:41.275+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 05:48:41.276+00	2026-03-19 05:48:41.276+00
f999fd25-a5ae-494a-904c-9758ffbf055f	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczOTAxNDIyLCJleHAiOjE3NzM5MDUwMjJ9.l16l_LLPJnAxAir0rjOaM3cTAY21OUlhXIP5wBzVNiw	2026-03-19 07:23:42.748+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 06:23:42.748+00	2026-03-19 06:23:42.748+00
93af2102-6981-403d-a5d9-83c35609aa31	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczOTAxODM5LCJleHAiOjE3NzM5MDU0Mzl9.EbRWiub3EyHKntQ0Gk9dieIjlBJHq4LCTAIsqnl4A-I	2026-03-19 07:30:39.369+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 06:30:39.37+00	2026-03-19 06:30:39.37+00
6a6f4d7d-383f-4194-9f5c-80ea0ae98e14	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczOTAyMzYzLCJleHAiOjE3NzM5MDU5NjN9.e7fOJ9Ig5LkZ6WovAfTRKmCUTdwoUZWFvLbOQNEJ_3w	2026-03-19 07:39:23.421+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 06:39:23.422+00	2026-03-19 06:39:23.422+00
384fab8d-605b-46a1-b418-bd423461a22e	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczOTAyNjUxLCJleHAiOjE3NzM5MDYyNTF9.LugTkw9azJ84bY7sfSSoEFGG6P3V51ljKNV-jr-MKrc	2026-03-19 07:44:11.894+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 06:44:11.895+00	2026-03-19 06:44:11.895+00
\.


--
-- Data for Name: account; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.account (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: invitation; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.invitation (id, "organizationId", email, role, status, "expiresAt", "createdAt", "inviterId") FROM stdin;
\.


--
-- Data for Name: jwks; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.jwks (id, "publicKey", "privateKey", "createdAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: member; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.member (id, "organizationId", "userId", role, "createdAt") FROM stdin;
\.


--
-- Data for Name: organization; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.organization (id, name, slug, logo, "createdAt", metadata) FROM stdin;
\.


--
-- Data for Name: project_config; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.project_config (id, name, endpoint_id, created_at, updated_at, trusted_origins, social_providers, email_provider, email_and_password, allow_localhost, plugin_configs, webhook_config) FROM stdin;
4e4f93b9-d673-4187-a323-524db561c973	titanium	ep-dark-flower-akyaoknb	2026-03-04 04:35:09.579+00	2026-03-04 04:35:09.579+00	[]	[{"id": "google", "isShared": true}]	{"type": "shared"}	{"enabled": true, "disableSignUp": false, "emailVerificationMethod": "otp", "requireEmailVerification": false, "autoSignInAfterVerification": true, "sendVerificationEmailOnSignIn": false, "sendVerificationEmailOnSignUp": false}	t	{"organization": {"config": {"creatorRole": "owner", "organizationLimit": 1, "allowUserToCreateOrganization": true}, "enabled": true}}	{"enabled": false, "enabledEvents": [], "timeoutSeconds": 5}
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId", "impersonatedBy", "activeOrganizationId") FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role, banned, "banReason", "banExpires") FROM stdin;
\.


--
-- Data for Name: verification; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: import_errors; Type: TABLE DATA; Schema: staging; Owner: -
--

COPY staging.import_errors (error_id, batch_id, row_num, field_name, error_message, created_at) FROM stdin;
\.


--
-- Data for Name: products_import; Type: TABLE DATA; Schema: staging; Owner: -
--

COPY staging.products_import (import_id, batch_id, row_num, id_producto, name, "brandId", "categoryId", price, stock, status, "productType", "imageUrl", description, features, "supplementFlavor", "supplementPresentation", "supplementServings", "apparelSize", "apparelColor", "apparelMaterial", created_at) FROM stdin;
1	51193c95-78eb-4b4f-a11d-1be128740f1c	2	1	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-05 06:49:47.065311
2	51193c95-78eb-4b4f-a11d-1be128740f1c	3	2	Tennis Adidas Runner Blanco	2	2	1150.00	8	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Blanco	Textil	2026-03-05 06:49:47.065311
3	51193c95-78eb-4b4f-a11d-1be128740f1c	4	3	Tennis Adidas Street Azul	2	2	1200.00	12	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Azul	Sintetico	2026-03-05 06:49:47.065311
4	51193c95-78eb-4b4f-a11d-1be128740f1c	5	4	Tennis Adidas Urban Gris	2	2	980.00	6	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Gris	Algodon	2026-03-05 06:49:47.065311
5	51193c95-78eb-4b4f-a11d-1be128740f1c	6	5	Tennis Adidas Pro Rojo	2	2	1350.00	7	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Rojo	Sintetico	2026-03-05 06:49:47.065311
6	51193c95-78eb-4b4f-a11d-1be128740f1c	7	6	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-05 06:49:47.065311
7	51193c95-78eb-4b4f-a11d-1be128740f1c	8	7	Tennis Adidas Max Verde	2	2	1250.00	5	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Verde	Sintetico	2026-03-05 06:49:47.065311
8	51193c95-78eb-4b4f-a11d-1be128740f1c	9	8	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-05 06:49:47.065311
9	51193c95-78eb-4b4f-a11d-1be128740f1c	10	9	Tennis Adidas Boost Naranja	2	2	1400.00	4	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	EG	Naranja	Textil	2026-03-05 06:49:47.065311
10	51193c95-78eb-4b4f-a11d-1be128740f1c	11	10	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-05 06:49:47.065311
11	4784e776-2c07-4a3e-9ada-8e7ee22e0a86	2	1	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 05:07:26.697902
12	4784e776-2c07-4a3e-9ada-8e7ee22e0a86	3	2	Tennis Adidas Runner Blanco	2	2	1150.00	8	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Blanco	Textil	2026-03-12 05:07:26.697902
13	4784e776-2c07-4a3e-9ada-8e7ee22e0a86	4	3	Tennis Adidas Street Azul	2	2	1200.00	12	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Azul	Sintetico	2026-03-12 05:07:26.697902
14	4784e776-2c07-4a3e-9ada-8e7ee22e0a86	5	4	Tennis Adidas Urban Gris	2	2	980.00	6	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Gris	Algodon	2026-03-12 05:07:26.697902
15	4784e776-2c07-4a3e-9ada-8e7ee22e0a86	6	5	Tennis Adidas Pro Rojo	2	2	1350.00	7	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Rojo	Sintetico	2026-03-12 05:07:26.697902
16	4784e776-2c07-4a3e-9ada-8e7ee22e0a86	7	6	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 05:07:26.697902
17	4784e776-2c07-4a3e-9ada-8e7ee22e0a86	8	7	Tennis Adidas Max Verde	2	2	1250.00	5	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Verde	Sintetico	2026-03-12 05:07:26.697902
18	4784e776-2c07-4a3e-9ada-8e7ee22e0a86	9	8	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 05:07:26.697902
19	4784e776-2c07-4a3e-9ada-8e7ee22e0a86	10	9	Tennis Adidas Boost Naranja	2	2	1400.00	4	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	EG	Naranja	Textil	2026-03-12 05:07:26.697902
20	4784e776-2c07-4a3e-9ada-8e7ee22e0a86	11	10	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 05:07:26.697902
21	84ed335d-ad33-4a6d-b8e1-d683f057edf6	2	\N	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 05:09:15.631451
22	84ed335d-ad33-4a6d-b8e1-d683f057edf6	3	\N	Tennis Adidas Runner Blanco	2	2	1150.00	8	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Blanco	Textil	2026-03-12 05:09:15.631451
23	84ed335d-ad33-4a6d-b8e1-d683f057edf6	4	\N	Tennis Adidas Street Azul	2	2	1200.00	12	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Azul	Sintetico	2026-03-12 05:09:15.631451
24	84ed335d-ad33-4a6d-b8e1-d683f057edf6	5	\N	Tennis Adidas Urban Gris	2	2	980.00	6	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Gris	Algodon	2026-03-12 05:09:15.631451
25	84ed335d-ad33-4a6d-b8e1-d683f057edf6	6	\N	Tennis Adidas Pro Rojo	2	2	1350.00	7	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Rojo	Sintetico	2026-03-12 05:09:15.631451
26	84ed335d-ad33-4a6d-b8e1-d683f057edf6	7	\N	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 05:09:15.631451
27	84ed335d-ad33-4a6d-b8e1-d683f057edf6	8	\N	Tennis Adidas Max Verde	2	2	1250.00	5	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Verde	Sintetico	2026-03-12 05:09:15.631451
28	84ed335d-ad33-4a6d-b8e1-d683f057edf6	9	\N	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 05:09:15.631451
29	84ed335d-ad33-4a6d-b8e1-d683f057edf6	10	\N	Tennis Adidas Boost Naranja	2	2	1400.00	4	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	EG	Naranja	Textil	2026-03-12 05:09:15.631451
30	84ed335d-ad33-4a6d-b8e1-d683f057edf6	11	\N	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 05:09:15.631451
31	60dd4bf6-4f5e-4029-8656-2f0d28489c7c	2	\N	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 05:18:37.675055
32	60dd4bf6-4f5e-4029-8656-2f0d28489c7c	3	\N	Tennis Adidas Runner Blanco	2	2	1150.00	8	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Blanco	Textil	2026-03-12 05:18:37.675055
33	60dd4bf6-4f5e-4029-8656-2f0d28489c7c	4	\N	Tennis Adidas Street Azul	2	2	1200.00	12	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Azul	Sintetico	2026-03-12 05:18:37.675055
34	60dd4bf6-4f5e-4029-8656-2f0d28489c7c	5	\N	Tennis Adidas Urban Gris	2	2	980.00	6	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Gris	Algodon	2026-03-12 05:18:37.675055
35	60dd4bf6-4f5e-4029-8656-2f0d28489c7c	6	\N	Tennis Adidas Pro Rojo	2	2	1350.00	7	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Rojo	Sintetico	2026-03-12 05:18:37.675055
36	60dd4bf6-4f5e-4029-8656-2f0d28489c7c	7	\N	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 05:18:37.675055
37	60dd4bf6-4f5e-4029-8656-2f0d28489c7c	8	\N	Tennis Adidas Max Verde	2	2	1250.00	5	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Verde	Sintetico	2026-03-12 05:18:37.675055
38	60dd4bf6-4f5e-4029-8656-2f0d28489c7c	9	\N	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 05:18:37.675055
39	60dd4bf6-4f5e-4029-8656-2f0d28489c7c	10	\N	Tennis Adidas Boost Naranja	2	2	1400.00	4	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	EG	Naranja	Textil	2026-03-12 05:18:37.675055
40	60dd4bf6-4f5e-4029-8656-2f0d28489c7c	11	\N	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 05:18:37.675055
41	180ecda9-2c08-4f2a-8bc1-50bcf570ee0e	2	\N	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 06:03:59.662186
42	180ecda9-2c08-4f2a-8bc1-50bcf570ee0e	3	\N	Tennis Adidas Runner Blanco	2	2	1150.00	8	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Blanco	Textil	2026-03-12 06:03:59.662186
43	180ecda9-2c08-4f2a-8bc1-50bcf570ee0e	4	\N	Tennis Adidas Street Azul	2	2	1200.00	12	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Azul	Sintetico	2026-03-12 06:03:59.662186
44	180ecda9-2c08-4f2a-8bc1-50bcf570ee0e	5	\N	Tennis Adidas Urban Gris	2	2	980.00	6	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Gris	Algodon	2026-03-12 06:03:59.662186
45	180ecda9-2c08-4f2a-8bc1-50bcf570ee0e	6	\N	Tennis Adidas Pro Rojo	2	2	1350.00	7	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Rojo	Sintetico	2026-03-12 06:03:59.662186
46	180ecda9-2c08-4f2a-8bc1-50bcf570ee0e	7	\N	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 06:03:59.662186
47	180ecda9-2c08-4f2a-8bc1-50bcf570ee0e	8	\N	Tennis Adidas Max Verde	2	2	1250.00	5	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Verde	Sintetico	2026-03-12 06:03:59.662186
48	180ecda9-2c08-4f2a-8bc1-50bcf570ee0e	9	\N	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 06:03:59.662186
49	180ecda9-2c08-4f2a-8bc1-50bcf570ee0e	10	\N	Tennis Adidas Boost Naranja	2	2	1400.00	4	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	EG	Naranja	Textil	2026-03-12 06:03:59.662186
157	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	48	146	Camiseta Gym 47	5	3	36.00	36	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
50	180ecda9-2c08-4f2a-8bc1-50bcf570ee0e	11	\N	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 06:03:59.662186
51	a4a94ce7-420a-433d-bfa2-e03a4450fed5	2	\N	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 06:29:05.125964
52	a4a94ce7-420a-433d-bfa2-e03a4450fed5	3	\N	Tennis Adidas Runner Blanco	2	2	1150.00	8	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Blanco	Textil	2026-03-12 06:29:05.125964
53	a4a94ce7-420a-433d-bfa2-e03a4450fed5	4	\N	Tennis Adidas Street Azul	2	2	1200.00	12	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Azul	Sintetico	2026-03-12 06:29:05.125964
54	a4a94ce7-420a-433d-bfa2-e03a4450fed5	5	\N	Tennis Adidas Urban Gris	2	2	980.00	6	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Gris	Algodon	2026-03-12 06:29:05.125964
55	a4a94ce7-420a-433d-bfa2-e03a4450fed5	6	\N	Tennis Adidas Pro Rojo	2	2	1350.00	7	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Rojo	Sintetico	2026-03-12 06:29:05.125964
56	a4a94ce7-420a-433d-bfa2-e03a4450fed5	7	\N	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 06:29:05.125964
57	a4a94ce7-420a-433d-bfa2-e03a4450fed5	8	\N	Tennis Adidas Max Verde	2	2	1250.00	5	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Verde	Sintetico	2026-03-12 06:29:05.125964
58	a4a94ce7-420a-433d-bfa2-e03a4450fed5	9	\N	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 06:29:05.125964
59	a4a94ce7-420a-433d-bfa2-e03a4450fed5	10	\N	Tennis Adidas Boost Naranja	2	2	1400.00	4	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	EG	Naranja	Textil	2026-03-12 06:29:05.125964
60	a4a94ce7-420a-433d-bfa2-e03a4450fed5	11	\N	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 06:29:05.125964
61	8d9f8845-2ae3-45e6-b560-ed7e7dfccbf7	2	\N	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 06:30:46.253421
62	8d9f8845-2ae3-45e6-b560-ed7e7dfccbf7	3	\N	Tennis Adidas Runner Blanco	2	2	1150.00	8	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Blanco	Textil	2026-03-12 06:30:46.253421
63	8d9f8845-2ae3-45e6-b560-ed7e7dfccbf7	4	\N	Tennis Adidas Street Azul	2	2	1200.00	12	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Azul	Sintetico	2026-03-12 06:30:46.253421
64	8d9f8845-2ae3-45e6-b560-ed7e7dfccbf7	5	\N	Tennis Adidas Urban Gris	2	2	980.00	6	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Gris	Algodon	2026-03-12 06:30:46.253421
65	8d9f8845-2ae3-45e6-b560-ed7e7dfccbf7	6	\N	Tennis Adidas Pro Rojo	2	2	1350.00	7	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Rojo	Sintetico	2026-03-12 06:30:46.253421
66	8d9f8845-2ae3-45e6-b560-ed7e7dfccbf7	7	\N	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 06:30:46.253421
67	8d9f8845-2ae3-45e6-b560-ed7e7dfccbf7	8	\N	Tennis Adidas Max Verde	2	2	1250.00	5	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Verde	Sintetico	2026-03-12 06:30:46.253421
68	8d9f8845-2ae3-45e6-b560-ed7e7dfccbf7	9	\N	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 06:30:46.253421
69	8d9f8845-2ae3-45e6-b560-ed7e7dfccbf7	10	\N	Tennis Adidas Boost Naranja	2	2	1400.00	4	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	EG	Naranja	Textil	2026-03-12 06:30:46.253421
70	8d9f8845-2ae3-45e6-b560-ed7e7dfccbf7	11	\N	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 06:30:46.253421
71	407be875-a0d7-419c-9824-90e84d09bb5e	2	\N	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 06:37:51.790891
72	407be875-a0d7-419c-9824-90e84d09bb5e	3	\N	Tennis Adidas Runner Blanco	2	2	1150.00	8	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Blanco	Textil	2026-03-12 06:37:51.790891
73	407be875-a0d7-419c-9824-90e84d09bb5e	4	\N	Tennis Adidas Street Azul	2	2	1200.00	12	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Azul	Sintetico	2026-03-12 06:37:51.790891
74	407be875-a0d7-419c-9824-90e84d09bb5e	5	\N	Tennis Adidas Urban Gris	2	2	980.00	6	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Gris	Algodon	2026-03-12 06:37:51.790891
75	407be875-a0d7-419c-9824-90e84d09bb5e	6	\N	Tennis Adidas Pro Rojo	2	2	1350.00	7	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Rojo	Sintetico	2026-03-12 06:37:51.790891
76	407be875-a0d7-419c-9824-90e84d09bb5e	7	\N	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 06:37:51.790891
77	407be875-a0d7-419c-9824-90e84d09bb5e	8	\N	Tennis Adidas Max Verde	2	2	1250.00	5	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Verde	Sintetico	2026-03-12 06:37:51.790891
78	407be875-a0d7-419c-9824-90e84d09bb5e	9	\N	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 06:37:51.790891
79	407be875-a0d7-419c-9824-90e84d09bb5e	10	\N	Tennis Adidas Boost Naranja	2	2	1400.00	4	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	EG	Naranja	Textil	2026-03-12 06:37:51.790891
80	407be875-a0d7-419c-9824-90e84d09bb5e	11	\N	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 06:37:51.790891
81	5120fc06-8101-46f1-8ec2-cc00e76e1de2	2	\N	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 06:42:20.52137
82	5120fc06-8101-46f1-8ec2-cc00e76e1de2	3	\N	Tennis Adidas Runner Blanco	2	2	1150.00	8	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Blanco	Textil	2026-03-12 06:42:20.52137
83	5120fc06-8101-46f1-8ec2-cc00e76e1de2	4	\N	Tennis Adidas Street Azul	2	2	1200.00	12	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Azul	Sintetico	2026-03-12 06:42:20.52137
84	5120fc06-8101-46f1-8ec2-cc00e76e1de2	5	\N	Tennis Adidas Urban Gris	2	2	980.00	6	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Gris	Algodon	2026-03-12 06:42:20.52137
85	5120fc06-8101-46f1-8ec2-cc00e76e1de2	6	\N	Tennis Adidas Pro Rojo	2	2	1350.00	7	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Rojo	Sintetico	2026-03-12 06:42:20.52137
86	5120fc06-8101-46f1-8ec2-cc00e76e1de2	7	\N	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 06:42:20.52137
87	5120fc06-8101-46f1-8ec2-cc00e76e1de2	8	\N	Tennis Adidas Max Verde	2	2	1250.00	5	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Verde	Sintetico	2026-03-12 06:42:20.52137
88	5120fc06-8101-46f1-8ec2-cc00e76e1de2	9	\N	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 06:42:20.52137
89	5120fc06-8101-46f1-8ec2-cc00e76e1de2	10	\N	Tennis Adidas Boost Naranja	2	2	1400.00	4	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	EG	Naranja	Textil	2026-03-12 06:42:20.52137
90	5120fc06-8101-46f1-8ec2-cc00e76e1de2	11	\N	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 06:42:20.52137
91	c4da5cf8-431c-4e19-9ed5-c7991515a59d	2	\N	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 06:49:51.280975
92	c4da5cf8-431c-4e19-9ed5-c7991515a59d	3	\N	Tennis Adidas Runner Blanco	2	2	1150.00	8	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Blanco	Textil	2026-03-12 06:49:51.280975
93	c4da5cf8-431c-4e19-9ed5-c7991515a59d	4	\N	Tennis Adidas Street Azul	2	2	1200.00	12	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Azul	Sintetico	2026-03-12 06:49:51.280975
94	c4da5cf8-431c-4e19-9ed5-c7991515a59d	5	\N	Tennis Adidas Urban Gris	2	2	980.00	6	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Gris	Algodon	2026-03-12 06:49:51.280975
95	c4da5cf8-431c-4e19-9ed5-c7991515a59d	6	\N	Tennis Adidas Pro Rojo	2	2	1350.00	7	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Rojo	Sintetico	2026-03-12 06:49:51.280975
96	c4da5cf8-431c-4e19-9ed5-c7991515a59d	7	\N	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 06:49:51.280975
97	c4da5cf8-431c-4e19-9ed5-c7991515a59d	8	\N	Tennis Adidas Max Verde	2	2	1250.00	5	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Verde	Sintetico	2026-03-12 06:49:51.280975
98	c4da5cf8-431c-4e19-9ed5-c7991515a59d	9	\N	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 06:49:51.280975
99	c4da5cf8-431c-4e19-9ed5-c7991515a59d	10	\N	Tennis Adidas Boost Naranja	2	2	1400.00	4	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	EG	Naranja	Textil	2026-03-12 06:49:51.280975
100	c4da5cf8-431c-4e19-9ed5-c7991515a59d	11	\N	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 06:49:51.280975
101	061a85f3-0415-40c2-85b1-9d9b4e563006	2	\N	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 06:51:31.347381
102	061a85f3-0415-40c2-85b1-9d9b4e563006	3	\N	Tennis Adidas Runner Blanco	2	2	1150.00	8	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Blanco	Textil	2026-03-12 06:51:31.347381
103	061a85f3-0415-40c2-85b1-9d9b4e563006	4	\N	Tennis Adidas Street Azul	2	2	1200.00	12	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Azul	Sintetico	2026-03-12 06:51:31.347381
104	061a85f3-0415-40c2-85b1-9d9b4e563006	5	\N	Tennis Adidas Urban Gris	2	2	980.00	6	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Gris	Algodon	2026-03-12 06:51:31.347381
105	061a85f3-0415-40c2-85b1-9d9b4e563006	6	\N	Tennis Adidas Pro Rojo	2	2	1350.00	7	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Rojo	Sintetico	2026-03-12 06:51:31.347381
106	061a85f3-0415-40c2-85b1-9d9b4e563006	7	\N	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 06:51:31.347381
107	061a85f3-0415-40c2-85b1-9d9b4e563006	8	\N	Tennis Adidas Max Verde	2	2	1250.00	5	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Verde	Sintetico	2026-03-12 06:51:31.347381
108	061a85f3-0415-40c2-85b1-9d9b4e563006	9	\N	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 06:51:31.347381
109	061a85f3-0415-40c2-85b1-9d9b4e563006	10	\N	Tennis Adidas Boost Naranja	2	2	1400.00	4	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	EG	Naranja	Textil	2026-03-12 06:51:31.347381
110	061a85f3-0415-40c2-85b1-9d9b4e563006	11	\N	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	Ropa	\N	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 06:51:31.347381
111	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	2	100	Whey Protein 1	1	1	55.00	20	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
112	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	3	101	Tennis Training 2	2	2	81.00	21	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
113	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	4	102	Camiseta Gym 3	3	3	32.00	22	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
114	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	5	103	Accesorio Fitness 4	4	4	18.00	23	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
115	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	6	104	Whey Protein 5	5	1	59.00	24	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
116	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	7	105	Tennis Training 6	6	2	85.00	25	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
117	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	8	106	Camiseta Gym 7	7	3	36.00	26	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
118	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	9	107	Accesorio Fitness 8	1	4	22.00	27	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
119	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	10	108	Whey Protein 9	2	1	63.00	28	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
120	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	11	109	Tennis Training 10	3	2	89.00	29	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
121	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	12	110	Camiseta Gym 11	4	3	30.00	30	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
122	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	13	111	Accesorio Fitness 12	5	4	16.00	31	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
123	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	14	112	Whey Protein 13	6	1	57.00	32	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
124	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	15	113	Tennis Training 14	7	2	93.00	33	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
125	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	16	114	Camiseta Gym 15	1	3	34.00	34	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
126	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	17	115	Accesorio Fitness 16	2	4	20.00	35	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
127	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	18	116	Whey Protein 17	3	1	61.00	36	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
128	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	19	117	Tennis Training 18	4	2	82.00	37	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
129	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	20	118	Camiseta Gym 19	5	3	38.00	38	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
130	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	21	119	Accesorio Fitness 20	6	4	24.00	39	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
131	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	22	120	Whey Protein 21	7	1	55.00	40	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
132	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	23	121	Tennis Training 22	1	2	86.00	41	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
133	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	24	122	Camiseta Gym 23	2	3	32.00	42	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
134	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	25	123	Accesorio Fitness 24	3	4	18.00	43	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
135	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	26	124	Whey Protein 25	4	1	59.00	44	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
136	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	27	125	Tennis Training 26	5	2	90.00	45	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
137	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	28	126	Camiseta Gym 27	6	3	36.00	46	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
138	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	29	127	Accesorio Fitness 28	7	4	22.00	47	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
139	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	30	128	Whey Protein 29	1	1	63.00	48	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
140	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	31	129	Tennis Training 30	2	2	94.00	49	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
141	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	32	130	Camiseta Gym 31	3	3	30.00	20	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
142	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	33	131	Accesorio Fitness 32	4	4	16.00	21	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
143	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	34	132	Whey Protein 33	5	1	57.00	22	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
144	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	35	133	Tennis Training 34	6	2	83.00	23	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
145	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	36	134	Camiseta Gym 35	7	3	34.00	24	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
146	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	37	135	Accesorio Fitness 36	1	4	20.00	25	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
147	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	38	136	Whey Protein 37	2	1	61.00	26	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
148	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	39	137	Tennis Training 38	3	2	87.00	27	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
149	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	40	138	Camiseta Gym 39	4	3	38.00	28	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
150	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	41	139	Accesorio Fitness 40	5	4	24.00	29	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
151	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	42	140	Whey Protein 41	6	1	55.00	30	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
152	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	43	141	Tennis Training 42	7	2	91.00	31	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
153	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	44	142	Camiseta Gym 43	1	3	32.00	32	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
154	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	45	143	Accesorio Fitness 44	2	4	18.00	33	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
155	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	46	144	Whey Protein 45	3	1	59.00	34	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
156	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	47	145	Tennis Training 46	4	2	80.00	35	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
158	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	49	147	Accesorio Fitness 48	6	4	22.00	37	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
159	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	50	148	Whey Protein 49	7	1	63.00	38	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
160	ff1fc6d4-90a0-46a9-8972-4bd4fb76c747	51	149	Tennis Training 50	1	2	84.00	39	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 21:59:37.521642
161	35577656-8b79-41ed-b101-70e94eea47cd	2	100	Whey Protein 1	1	1	55.00	20	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
162	35577656-8b79-41ed-b101-70e94eea47cd	3	101	Tennis Training 2	2	2	81.00	21	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
163	35577656-8b79-41ed-b101-70e94eea47cd	4	102	Camiseta Gym 3	3	3	32.00	22	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
164	35577656-8b79-41ed-b101-70e94eea47cd	5	103	Accesorio Fitness 4	4	4	18.00	23	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
165	35577656-8b79-41ed-b101-70e94eea47cd	6	104	Whey Protein 5	5	1	59.00	24	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
166	35577656-8b79-41ed-b101-70e94eea47cd	7	105	Tennis Training 6	6	2	85.00	25	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
167	35577656-8b79-41ed-b101-70e94eea47cd	8	106	Camiseta Gym 7	7	3	36.00	26	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
168	35577656-8b79-41ed-b101-70e94eea47cd	9	107	Accesorio Fitness 8	1	4	22.00	27	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
169	35577656-8b79-41ed-b101-70e94eea47cd	10	108	Whey Protein 9	2	1	63.00	28	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
170	35577656-8b79-41ed-b101-70e94eea47cd	11	109	Tennis Training 10	3	2	89.00	29	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
171	35577656-8b79-41ed-b101-70e94eea47cd	12	110	Camiseta Gym 11	4	3	30.00	30	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
172	35577656-8b79-41ed-b101-70e94eea47cd	13	111	Accesorio Fitness 12	5	4	16.00	31	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
173	35577656-8b79-41ed-b101-70e94eea47cd	14	112	Whey Protein 13	6	1	57.00	32	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
174	35577656-8b79-41ed-b101-70e94eea47cd	15	113	Tennis Training 14	7	2	93.00	33	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
175	35577656-8b79-41ed-b101-70e94eea47cd	16	114	Camiseta Gym 15	1	3	34.00	34	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
176	35577656-8b79-41ed-b101-70e94eea47cd	17	115	Accesorio Fitness 16	2	4	20.00	35	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
177	35577656-8b79-41ed-b101-70e94eea47cd	18	116	Whey Protein 17	3	1	61.00	36	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
178	35577656-8b79-41ed-b101-70e94eea47cd	19	117	Tennis Training 18	4	2	82.00	37	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
179	35577656-8b79-41ed-b101-70e94eea47cd	20	118	Camiseta Gym 19	5	3	38.00	38	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
180	35577656-8b79-41ed-b101-70e94eea47cd	21	119	Accesorio Fitness 20	6	4	24.00	39	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
181	35577656-8b79-41ed-b101-70e94eea47cd	22	120	Whey Protein 21	7	1	55.00	40	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
182	35577656-8b79-41ed-b101-70e94eea47cd	23	121	Tennis Training 22	1	2	86.00	41	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
183	35577656-8b79-41ed-b101-70e94eea47cd	24	122	Camiseta Gym 23	2	3	32.00	42	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
184	35577656-8b79-41ed-b101-70e94eea47cd	25	123	Accesorio Fitness 24	3	4	18.00	43	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
185	35577656-8b79-41ed-b101-70e94eea47cd	26	124	Whey Protein 25	4	1	59.00	44	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
186	35577656-8b79-41ed-b101-70e94eea47cd	27	125	Tennis Training 26	5	2	90.00	45	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
187	35577656-8b79-41ed-b101-70e94eea47cd	28	126	Camiseta Gym 27	6	3	36.00	46	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
188	35577656-8b79-41ed-b101-70e94eea47cd	29	127	Accesorio Fitness 28	7	4	22.00	47	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
189	35577656-8b79-41ed-b101-70e94eea47cd	30	128	Whey Protein 29	1	1	63.00	48	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
190	35577656-8b79-41ed-b101-70e94eea47cd	31	129	Tennis Training 30	2	2	94.00	49	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
191	35577656-8b79-41ed-b101-70e94eea47cd	32	130	Camiseta Gym 31	3	3	30.00	20	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
192	35577656-8b79-41ed-b101-70e94eea47cd	33	131	Accesorio Fitness 32	4	4	16.00	21	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
193	35577656-8b79-41ed-b101-70e94eea47cd	34	132	Whey Protein 33	5	1	57.00	22	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
194	35577656-8b79-41ed-b101-70e94eea47cd	35	133	Tennis Training 34	6	2	83.00	23	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
195	35577656-8b79-41ed-b101-70e94eea47cd	36	134	Camiseta Gym 35	7	3	34.00	24	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
196	35577656-8b79-41ed-b101-70e94eea47cd	37	135	Accesorio Fitness 36	1	4	20.00	25	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
197	35577656-8b79-41ed-b101-70e94eea47cd	38	136	Whey Protein 37	2	1	61.00	26	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
198	35577656-8b79-41ed-b101-70e94eea47cd	39	137	Tennis Training 38	3	2	87.00	27	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
199	35577656-8b79-41ed-b101-70e94eea47cd	40	138	Camiseta Gym 39	4	3	38.00	28	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
200	35577656-8b79-41ed-b101-70e94eea47cd	41	139	Accesorio Fitness 40	5	4	24.00	29	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
201	35577656-8b79-41ed-b101-70e94eea47cd	42	140	Whey Protein 41	6	1	55.00	30	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
202	35577656-8b79-41ed-b101-70e94eea47cd	43	141	Tennis Training 42	7	2	91.00	31	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
203	35577656-8b79-41ed-b101-70e94eea47cd	44	142	Camiseta Gym 43	1	3	32.00	32	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
204	35577656-8b79-41ed-b101-70e94eea47cd	45	143	Accesorio Fitness 44	2	4	18.00	33	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
205	35577656-8b79-41ed-b101-70e94eea47cd	46	144	Whey Protein 45	3	1	59.00	34	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
206	35577656-8b79-41ed-b101-70e94eea47cd	47	145	Tennis Training 46	4	2	80.00	35	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
207	35577656-8b79-41ed-b101-70e94eea47cd	48	146	Camiseta Gym 47	5	3	36.00	36	Activo	apparel	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
208	35577656-8b79-41ed-b101-70e94eea47cd	49	147	Accesorio Fitness 48	6	4	22.00	37	Activo	accessory	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
209	35577656-8b79-41ed-b101-70e94eea47cd	50	148	Whey Protein 49	7	1	63.00	38	Activo	supplement	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
210	35577656-8b79-41ed-b101-70e94eea47cd	51	149	Tennis Training 50	1	2	84.00	39	Activo	shoes	\N	\N	[]	\N	\N	\N	\N	\N	\N	2026-03-12 22:00:53.98141
211	18c2c839-c85b-4a6b-875b-3fb125615efa	2	\N	Whey protein 1	1	1	520.00	22	Activo	Suplementación	https://res.cloudinary.com/demo/image/upload/proteina_15.jpg	Suplemento deportivo whey protein 1.	["Recuperacion","Energia"]	Vainilla	1 kg	40	\N	\N	\N	2026-03-12 22:08:06.191032
212	18c2c839-c85b-4a6b-875b-3fb125615efa	3	\N	Proteina vegetal 2	1	1	680.00	21	Activo	Suplementación	https://res.cloudinary.com/demo/image/upload/proteina_16.jpg	Suplemento deportivo proteina vegetal 2.	["Ganancia muscular"]	Chocolate	1 kg	20	\N	\N	\N	2026-03-12 22:08:06.191032
213	18c2c839-c85b-4a6b-875b-3fb125615efa	4	\N	Pre entreno 3	1	1	750.00	5	Activo	Suplementación	https://res.cloudinary.com/demo/image/upload/proteina_17.jpg	Suplemento deportivo pre entreno 3.	["Recuperacion","Energia"]	Cookies & Cream	5 lb	60	\N	\N	\N	2026-03-12 22:08:06.191032
214	18c2c839-c85b-4a6b-875b-3fb125615efa	5	\N	Proteina vegetal 4	1	1	890.00	8	Activo	Suplementación	https://res.cloudinary.com/demo/image/upload/proteina_18.jpg	Suplemento deportivo proteina vegetal 4.	["Recuperacion","Energia"]	Fresa	1 kg	40	\N	\N	\N	2026-03-12 22:08:06.191032
215	18c2c839-c85b-4a6b-875b-3fb125615efa	6	\N	Proteina vegetal 5	1	1	450.00	19	Activo	Suplementación	https://res.cloudinary.com/demo/image/upload/proteina_19.jpg	Suplemento deportivo proteina vegetal 5.	["Alto en proteina"]	Fresa	2 lb	20	\N	\N	\N	2026-03-12 22:08:06.191032
216	18c2c839-c85b-4a6b-875b-3fb125615efa	7	\N	Proteina vegetal 6	1	1	680.00	7	Activo	Suplementación	https://res.cloudinary.com/demo/image/upload/proteina_20.jpg	Suplemento deportivo proteina vegetal 6.	["Alto en proteina"]	Platano	2 lb	20	\N	\N	\N	2026-03-12 22:08:06.191032
217	18c2c839-c85b-4a6b-875b-3fb125615efa	8	\N	Pre entreno 7	1	1	1100.00	13	Activo	Suplementación	https://res.cloudinary.com/demo/image/upload/proteina_21.jpg	Suplemento deportivo pre entreno 7.	["Recuperacion","Energia"]	Chocolate	500 g	40	\N	\N	\N	2026-03-12 22:08:06.191032
218	18c2c839-c85b-4a6b-875b-3fb125615efa	9	\N	BCAA 8	1	1	750.00	25	Activo	Suplementación	https://res.cloudinary.com/demo/image/upload/proteina_22.jpg	Suplemento deportivo bcaa 8.	["Alto en proteina"]	Fresa	1 kg	30	\N	\N	\N	2026-03-12 22:08:06.191032
219	18c2c839-c85b-4a6b-875b-3fb125615efa	10	\N	Creatina monohidratada 9	1	1	1100.00	13	Activo	Suplementación	https://res.cloudinary.com/demo/image/upload/proteina_23.jpg	Suplemento deportivo creatina monohidratada 9.	["Recuperacion","Energia"]	Vainilla	5 lb	60	\N	\N	\N	2026-03-12 22:08:06.191032
220	18c2c839-c85b-4a6b-875b-3fb125615efa	11	\N	BCAA 10	1	1	1100.00	13	Activo	Suplementación	https://res.cloudinary.com/demo/image/upload/proteina_24.jpg	Suplemento deportivo bcaa 10.	["Ganancia muscular"]	Vainilla	2 lb	20	\N	\N	\N	2026-03-12 22:08:06.191032
221	18c2c839-c85b-4a6b-875b-3fb125615efa	12	\N	Pre entreno 11	1	1	1100.00	25	Activo	Suplementación	https://res.cloudinary.com/demo/image/upload/proteina_25.jpg	Suplemento deportivo pre entreno 11.	["Recuperacion","Energia"]	Fresa	5 lb	60	\N	\N	\N	2026-03-12 22:08:06.191032
222	18c2c839-c85b-4a6b-875b-3fb125615efa	13	\N	Creatina monohidratada 12	1	1	1100.00	23	Activo	Suplementación	https://res.cloudinary.com/demo/image/upload/proteina_26.jpg	Suplemento deportivo creatina monohidratada 12.	["Recuperacion","Energia"]	Vainilla	2 lb	40	\N	\N	\N	2026-03-12 22:08:06.191032
223	18c2c839-c85b-4a6b-875b-3fb125615efa	14	\N	Tennis confort 13	3	2	980.00	4	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/tennis_27.jpg	Par de tennis confort 13 para entrenamiento.	["Amortiguacion"]	\N	\N	\N	M	Blanco	Textil	2026-03-12 22:08:06.191032
224	18c2c839-c85b-4a6b-875b-3fb125615efa	15	\N	Tennis sport 14	2	2	1590.00	11	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/tennis_28.jpg	Par de tennis sport 14 para entrenamiento.	["Amortiguacion"]	\N	\N	\N	CH	Verde	Poliester	2026-03-12 22:08:06.191032
225	18c2c839-c85b-4a6b-875b-3fb125615efa	16	\N	Tennis running 15	3	2	1250.00	9	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/tennis_29.jpg	Par de tennis running 15 para entrenamiento.	["Entrenamiento"]	\N	\N	\N	G	Blanco	Algodon	2026-03-12 22:08:06.191032
226	18c2c839-c85b-4a6b-875b-3fb125615efa	17	\N	Tennis performance 16	2	2	1050.00	13	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/tennis_30.jpg	Par de tennis performance 16 para entrenamiento.	["Comodo","Ligero"]	\N	\N	\N	G	Naranja	Algodon	2026-03-12 22:08:06.191032
227	18c2c839-c85b-4a6b-875b-3fb125615efa	18	\N	Tennis urbanos deportivos 17	3	2	980.00	12	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/tennis_31.jpg	Par de tennis urbanos deportivos 17 para entrenamiento.	["Comodo","Ligero"]	\N	\N	\N	G	Naranja	Textil	2026-03-12 22:08:06.191032
228	18c2c839-c85b-4a6b-875b-3fb125615efa	19	\N	Tennis performance 18	3	2	1190.00	3	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/tennis_32.jpg	Par de tennis performance 18 para entrenamiento.	["Entrenamiento"]	\N	\N	\N	CH	Rojo	Algodon	2026-03-12 22:08:06.191032
229	18c2c839-c85b-4a6b-875b-3fb125615efa	20	\N	Tennis training 19	2	2	1100.00	5	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/tennis_33.jpg	Par de tennis training 19 para entrenamiento.	["Running"]	\N	\N	\N	EG	Naranja	Algodon	2026-03-12 22:08:06.191032
230	18c2c839-c85b-4a6b-875b-3fb125615efa	21	\N	Tennis performance 20	4	2	1190.00	14	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/tennis_34.jpg	Par de tennis performance 20 para entrenamiento.	["Amortiguacion"]	\N	\N	\N	G	Gris	Textil	2026-03-12 22:08:06.191032
231	18c2c839-c85b-4a6b-875b-3fb125615efa	22	\N	Tennis active 21	3	2	1190.00	6	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/tennis_35.jpg	Par de tennis active 21 para entrenamiento.	["Amortiguacion"]	\N	\N	\N	EG	Blanco	Sintetico	2026-03-12 22:08:06.191032
232	18c2c839-c85b-4a6b-875b-3fb125615efa	23	\N	Tennis confort 22	2	2	1050.00	14	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/tennis_36.jpg	Par de tennis confort 22 para entrenamiento.	["Comodo","Ligero"]	\N	\N	\N	M	Negro	Algodon	2026-03-12 22:08:06.191032
233	18c2c839-c85b-4a6b-875b-3fb125615efa	24	\N	Tennis running 23	4	2	1050.00	11	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/tennis_37.jpg	Par de tennis running 23 para entrenamiento.	["Running"]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 22:08:06.191032
234	18c2c839-c85b-4a6b-875b-3fb125615efa	25	\N	Tennis gym 24	2	2	1590.00	6	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/tennis_38.jpg	Par de tennis gym 24 para entrenamiento.	["Comodo","Ligero"]	\N	\N	\N	M	Morado	Poliester	2026-03-12 22:08:06.191032
235	18c2c839-c85b-4a6b-875b-3fb125615efa	26	\N	Hoodie fitness 25	7	3	720.00	17	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/ropa_39.jpg	Prenda deportiva hoodie fitness 25.	["Comodo","Fresco"]	\N	\N	\N	CH	Verde	Textil	2026-03-12 22:08:06.191032
236	18c2c839-c85b-4a6b-875b-3fb125615efa	27	\N	Pants training 26	7	3	720.00	7	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/ropa_40.jpg	Prenda deportiva pants training 26.	["Comodo","Fresco"]	\N	\N	\N	CH	Verde	Algodon	2026-03-12 22:08:06.191032
237	18c2c839-c85b-4a6b-875b-3fb125615efa	28	\N	Leggings compresion 27	5	3	520.00	12	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/ropa_41.jpg	Prenda deportiva leggings compresion 27.	["Transpirable"]	\N	\N	\N	EG	Verde	Textil	2026-03-12 22:08:06.191032
238	18c2c839-c85b-4a6b-875b-3fb125615efa	29	\N	Leggings compresion 28	7	3	1110.00	4	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/ropa_42.jpg	Prenda deportiva leggings compresion 28.	["Comodo","Fresco"]	\N	\N	\N	EG	Negro	Algodon	2026-03-12 22:08:06.191032
239	18c2c839-c85b-4a6b-875b-3fb125615efa	30	\N	Leggings compresion 29	4	3	590.00	16	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/ropa_43.jpg	Prenda deportiva leggings compresion 29.	["Uso diario"]	\N	\N	\N	EG	Beige	Textil	2026-03-12 22:08:06.191032
240	18c2c839-c85b-4a6b-875b-3fb125615efa	31	\N	Short training 30	4	3	990.00	13	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/ropa_44.jpg	Prenda deportiva short training 30.	["Uso diario"]	\N	\N	\N	CH	Rojo	Poliester	2026-03-12 22:08:06.191032
241	18c2c839-c85b-4a6b-875b-3fb125615efa	32	\N	Chamarra ligera 31	7	3	590.00	5	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/ropa_45.jpg	Prenda deportiva chamarra ligera 31.	["Transpirable"]	\N	\N	\N	M	Rojo	Poliester	2026-03-12 22:08:06.191032
242	18c2c839-c85b-4a6b-875b-3fb125615efa	33	\N	Chamarra ligera 32	2	3	990.00	20	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/ropa_46.jpg	Prenda deportiva chamarra ligera 32.	["Comodo","Fresco"]	\N	\N	\N	G	Negro	Algodon	2026-03-12 22:08:06.191032
243	18c2c839-c85b-4a6b-875b-3fb125615efa	34	\N	Short training 33	2	3	450.00	11	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/ropa_47.jpg	Prenda deportiva short training 33.	["Transpirable"]	\N	\N	\N	CH	Blanco	Algodon	2026-03-12 22:08:06.191032
244	18c2c839-c85b-4a6b-875b-3fb125615efa	35	\N	Sudadera oversize 34	7	3	1110.00	14	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/ropa_48.jpg	Prenda deportiva sudadera oversize 34.	["Comodo","Fresco"]	\N	\N	\N	CH	Verde	Textil	2026-03-12 22:08:06.191032
245	18c2c839-c85b-4a6b-875b-3fb125615efa	36	\N	Leggings compresion 35	6	3	520.00	13	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/ropa_49.jpg	Prenda deportiva leggings compresion 35.	["Secado rapido"]	\N	\N	\N	M	Verde	Sintetico	2026-03-12 22:08:06.191032
246	18c2c839-c85b-4a6b-875b-3fb125615efa	37	\N	Jogger deportivo 36	7	3	450.00	6	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/ropa_50.jpg	Prenda deportiva jogger deportivo 36.	["Uso diario"]	\N	\N	\N	CH	Morado	Algodon	2026-03-12 22:08:06.191032
247	18c2c839-c85b-4a6b-875b-3fb125615efa	38	\N	Leggings compresion 37	2	3	590.00	15	Activo	Ropa	https://res.cloudinary.com/demo/image/upload/ropa_51.jpg	Prenda deportiva leggings compresion 37.	["Secado rapido"]	\N	\N	\N	M	Blanco	Sintetico	2026-03-12 22:08:06.191032
248	18c2c839-c85b-4a6b-875b-3fb125615efa	39	\N	Shaker deportivo 38	4	4	120.00	27	Activo	Accesorio	https://res.cloudinary.com/demo/image/upload/accesorio_52.jpg	Accesorio deportivo shaker deportivo 38.	["Uso diario"]	\N	\N	\N	\N	Morado	Poliester	2026-03-12 22:08:06.191032
249	18c2c839-c85b-4a6b-875b-3fb125615efa	40	\N	Toalla fitness 39	6	4	180.00	9	Activo	Accesorio	https://res.cloudinary.com/demo/image/upload/accesorio_53.jpg	Accesorio deportivo toalla fitness 39.	["Resistente"]	\N	\N	\N	\N	Rojo	Algodon	2026-03-12 22:08:06.191032
250	18c2c839-c85b-4a6b-875b-3fb125615efa	41	\N	Cuerda para saltar 40	7	4	280.00	28	Activo	Accesorio	https://res.cloudinary.com/demo/image/upload/accesorio_54.jpg	Accesorio deportivo cuerda para saltar 40.	["Uso diario"]	\N	\N	\N	\N	Rojo	Textil	2026-03-12 22:08:06.191032
251	18c2c839-c85b-4a6b-875b-3fb125615efa	42	\N	Botella deportiva 41	4	4	120.00	8	Activo	Accesorio	https://res.cloudinary.com/demo/image/upload/accesorio_55.jpg	Accesorio deportivo botella deportiva 41.	["Comodo"]	\N	\N	\N	\N	Rojo	Sintetico	2026-03-12 22:08:06.191032
252	18c2c839-c85b-4a6b-875b-3fb125615efa	43	\N	Muñequeras 42	7	4	420.00	30	Activo	Accesorio	https://res.cloudinary.com/demo/image/upload/accesorio_56.jpg	Accesorio deportivo muñequeras 42.	["Entrenamiento"]	\N	\N	\N	\N	Negro	Sintetico	2026-03-12 22:08:06.191032
253	18c2c839-c85b-4a6b-875b-3fb125615efa	44	\N	Toalla fitness 43	3	4	499.00	23	Activo	Accesorio	https://res.cloudinary.com/demo/image/upload/accesorio_57.jpg	Accesorio deportivo toalla fitness 43.	["Comodo"]	\N	\N	\N	\N	Naranja	Textil	2026-03-12 22:08:06.191032
254	18c2c839-c85b-4a6b-875b-3fb125615efa	45	\N	Cinturon levantamiento 44	2	4	120.00	17	Activo	Accesorio	https://res.cloudinary.com/demo/image/upload/accesorio_58.jpg	Accesorio deportivo cinturon levantamiento 44.	["Resistente"]	\N	\N	\N	\N	Naranja	Algodon	2026-03-12 22:08:06.191032
255	18c2c839-c85b-4a6b-875b-3fb125615efa	46	\N	Cuerda para saltar 45	6	4	120.00	15	Activo	Accesorio	https://res.cloudinary.com/demo/image/upload/accesorio_59.jpg	Accesorio deportivo cuerda para saltar 45.	["Comodo"]	\N	\N	\N	\N	Azul	Textil	2026-03-12 22:08:06.191032
256	18c2c839-c85b-4a6b-875b-3fb125615efa	47	\N	Guantes gimnasio 46	4	4	180.00	17	Activo	Accesorio	https://res.cloudinary.com/demo/image/upload/accesorio_60.jpg	Accesorio deportivo guantes gimnasio 46.	["Resistente"]	\N	\N	\N	\N	Gris	Sintetico	2026-03-12 22:08:06.191032
257	18c2c839-c85b-4a6b-875b-3fb125615efa	48	\N	Muñequeras 47	6	4	220.00	19	Activo	Accesorio	https://res.cloudinary.com/demo/image/upload/accesorio_61.jpg	Accesorio deportivo muñequeras 47.	["Resistente"]	\N	\N	\N	\N	Azul	Textil	2026-03-12 22:08:06.191032
258	18c2c839-c85b-4a6b-875b-3fb125615efa	49	\N	Shaker deportivo 48	2	4	350.00	11	Activo	Accesorio	https://res.cloudinary.com/demo/image/upload/accesorio_62.jpg	Accesorio deportivo shaker deportivo 48.	["Comodo"]	\N	\N	\N	\N	Gris	Sintetico	2026-03-12 22:08:06.191032
259	18c2c839-c85b-4a6b-875b-3fb125615efa	50	\N	Cinturon levantamiento 49	7	4	280.00	12	Activo	Accesorio	https://res.cloudinary.com/demo/image/upload/accesorio_63.jpg	Accesorio deportivo cinturon levantamiento 49.	["Entrenamiento"]	\N	\N	\N	\N	Beige	Poliester	2026-03-12 22:08:06.191032
260	18c2c839-c85b-4a6b-875b-3fb125615efa	51	\N	Rodilleras gym 50	5	4	120.00	27	Activo	Accesorio	https://res.cloudinary.com/demo/image/upload/accesorio_64.jpg	Accesorio deportivo rodilleras gym 50.	["Resistente"]	\N	\N	\N	\N	Gris	Sintetico	2026-03-12 22:08:06.191032
\.


--
-- Name: Brands_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."Brands_id_seq"', 11, true);


--
-- Name: Categories_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."Categories_id_seq"', 5, true);


--
-- Name: Products_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."Products_id_seq"', 89, true);


--
-- Name: product_images_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.product_images_id_seq', 13, true);


--
-- Name: products_id_producto_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.products_id_producto_seq', 83, true);


--
-- Name: import_errors_error_id_seq; Type: SEQUENCE SET; Schema: staging; Owner: -
--

SELECT pg_catalog.setval('staging.import_errors_error_id_seq', 1, false);


--
-- Name: products_import_import_id_seq; Type: SEQUENCE SET; Schema: staging; Owner: -
--

SELECT pg_catalog.setval('staging.products_import_import_id_seq', 260, true);


--
-- Name: Brands Brands_id_marca_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Brands"
    ADD CONSTRAINT "Brands_id_marca_key" UNIQUE (id_marca);


--
-- Name: Brands Brands_name_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Brands"
    ADD CONSTRAINT "Brands_name_key" UNIQUE (name);


--
-- Name: Brands Brands_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Brands"
    ADD CONSTRAINT "Brands_pkey" PRIMARY KEY (id);


--
-- Name: Categories Categories_id_categoria_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Categories"
    ADD CONSTRAINT "Categories_id_categoria_key" UNIQUE (id_categoria);


--
-- Name: Categories Categories_name_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Categories"
    ADD CONSTRAINT "Categories_name_key" UNIQUE (name);


--
-- Name: Categories Categories_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Categories"
    ADD CONSTRAINT "Categories_pkey" PRIMARY KEY (id);


--
-- Name: Products Products_id_producto_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Products"
    ADD CONSTRAINT "Products_id_producto_key" UNIQUE (id_producto);


--
-- Name: Products Products_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Products"
    ADD CONSTRAINT "Products_pkey" PRIMARY KEY (id);


--
-- Name: Users Users_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: invitation invitation_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT invitation_pkey PRIMARY KEY (id);


--
-- Name: jwks jwks_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.jwks
    ADD CONSTRAINT jwks_pkey PRIMARY KEY (id);


--
-- Name: member member_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_pkey PRIMARY KEY (id);


--
-- Name: organization organization_slug_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_slug_key UNIQUE (slug);


--
-- Name: project_config project_config_endpoint_id_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_endpoint_id_key UNIQUE (endpoint_id);


--
-- Name: project_config project_config_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: import_errors import_errors_pkey; Type: CONSTRAINT; Schema: staging; Owner: -
--

ALTER TABLE ONLY staging.import_errors
    ADD CONSTRAINT import_errors_pkey PRIMARY KEY (error_id);


--
-- Name: products_import products_import_pkey; Type: CONSTRAINT; Schema: staging; Owner: -
--

ALTER TABLE ONLY staging.products_import
    ADD CONSTRAINT products_import_pkey PRIMARY KEY (import_id);


--
-- Name: uq_products_name_brand_category; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX uq_products_name_brand_category ON core."Products" USING btree (lower(btrim((name)::text)), "brandId", "categoryId");


--
-- Name: account_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "account_userId_idx" ON neon_auth.account USING btree ("userId");


--
-- Name: invitation_email_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX invitation_email_idx ON neon_auth.invitation USING btree (email);


--
-- Name: invitation_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "invitation_organizationId_idx" ON neon_auth.invitation USING btree ("organizationId");


--
-- Name: member_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "member_organizationId_idx" ON neon_auth.member USING btree ("organizationId");


--
-- Name: member_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "member_userId_idx" ON neon_auth.member USING btree ("userId");


--
-- Name: organization_slug_uidx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE UNIQUE INDEX organization_slug_uidx ON neon_auth.organization USING btree (slug);


--
-- Name: session_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "session_userId_idx" ON neon_auth.session USING btree ("userId");


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX verification_identifier_idx ON neon_auth.verification USING btree (identifier);


--
-- Name: Brands Brands_categoryId_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Brands"
    ADD CONSTRAINT "Brands_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES core."Categories"(id_categoria) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Products Products_brandId_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Products"
    ADD CONSTRAINT "Products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES core."Brands"(id_marca) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Products Products_categoryId_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Products"
    ADD CONSTRAINT "Products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES core."Categories"(id_categoria) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_images product_images_productId_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.product_images
    ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES core."Products"(id_producto) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES core."Users"(id) ON UPDATE CASCADE;


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_inviterId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict H3hlhYivO3mOhAKkPBBwaKXY9fHJHcAwJVJieempOXO1VzClMN6mDm4hDb6fjws

