--
-- PostgreSQL database dump
--

\restrict 8jw1ObT8ncBqxUo7mo6NCNdVV1NjXjG4teXqcD1Zd88qpSP2B0VeMziELhcMr18

-- Dumped from database version 17.8 (a284a84)
-- Dumped by pg_dump version 18.1

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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AboutPages; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core."AboutPages" (
    id integer NOT NULL,
    slug character varying(80) DEFAULT 'main'::character varying NOT NULL,
    "heroLabel" character varying(120),
    "heroTitle" character varying(220) DEFAULT 'Acerca de Nosotros'::character varying NOT NULL,
    "heroHighlight" character varying(120) DEFAULT 'Nosotros'::character varying,
    "heroSubtitle" text,
    "heroImageUrl" character varying(1000),
    "heroImagePublicId" character varying(255),
    "introTitle" character varying(220),
    "introHighlight" character varying(120),
    "introText" text,
    "introImageUrl" character varying(1000),
    "introImagePublicId" character varying(255),
    "stat1Value" character varying(50),
    "stat1Label" character varying(120),
    "stat2Value" character varying(50),
    "stat2Label" character varying(120),
    "stat3Value" character varying(50),
    "stat3Label" character varying(120),
    "missionTitle" character varying(120) DEFAULT 'Mision'::character varying,
    "missionText" text,
    "missionImageUrl" character varying(1000),
    "missionImagePublicId" character varying(255),
    "visionTitle" character varying(120) DEFAULT 'Vision'::character varying,
    "visionText" text,
    "visionImageUrl" character varying(1000),
    "visionImagePublicId" character varying(255),
    "valuesTitle" character varying(120) DEFAULT 'Valores'::character varying,
    "valuesText" text,
    "valuesImageUrl" character varying(1000),
    "valuesImagePublicId" character varying(255),
    "ctaTitle" character varying(220),
    "ctaText" text,
    "ctaAddress" character varying(255),
    "ctaPhone" character varying(80),
    "ctaPrimaryButtonText" character varying(80),
    "ctaPrimaryButtonLink" character varying(255),
    "ctaSecondaryButtonText" character varying(80),
    "ctaSecondaryButtonLink" character varying(255),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: AboutPages_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core."AboutPages_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AboutPages_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: -
--

ALTER SEQUENCE core."AboutPages_id_seq" OWNED BY core."AboutPages".id;


--
-- Name: AboutTeamMembers; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core."AboutTeamMembers" (
    id integer NOT NULL,
    "aboutPageId" integer NOT NULL,
    name character varying(140) NOT NULL,
    role character varying(160) NOT NULL,
    description text,
    "imageUrl" character varying(1000),
    "imagePublicId" character varying(255),
    "facebookUrl" character varying(255),
    "twitterUrl" character varying(255),
    "linkedinUrl" character varying(255),
    "order" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: AboutTeamMembers_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core."AboutTeamMembers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AboutTeamMembers_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: -
--

ALTER SEQUENCE core."AboutTeamMembers_id_seq" OWNED BY core."AboutTeamMembers".id;


--
-- Name: AboutValues; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core."AboutValues" (
    id integer NOT NULL,
    "aboutPageId" integer NOT NULL,
    title character varying(120) NOT NULL,
    description text NOT NULL,
    "iconKey" character varying(80) DEFAULT 'shield'::character varying,
    "order" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: AboutValues_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core."AboutValues_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AboutValues_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: -
--

ALTER SEQUENCE core."AboutValues_id_seq" OWNED BY core."AboutValues".id;


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
-- Name: UserCalorieHistory; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core."UserCalorieHistory" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "recordDate" date NOT NULL,
    "dailyCalories" integer NOT NULL,
    "nextAllowedDate" date NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: UserProfiles; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core."UserProfiles" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    age integer,
    gender character varying(20),
    height numeric(4,2),
    "initialWeight" numeric(5,2),
    "targetWeight" numeric(5,2),
    "startDate" date,
    "weeklyGymDays" integer,
    "activityLevel" character varying(30),
    "fitnessGoal" character varying(20),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: UserWeightHistory; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core."UserWeightHistory" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "recordDate" date NOT NULL,
    weight numeric(5,2) NOT NULL,
    "nextAllowedDate" date NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


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
-- Name: AboutPages id; Type: DEFAULT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."AboutPages" ALTER COLUMN id SET DEFAULT nextval('core."AboutPages_id_seq"'::regclass);


--
-- Name: AboutTeamMembers id; Type: DEFAULT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."AboutTeamMembers" ALTER COLUMN id SET DEFAULT nextval('core."AboutTeamMembers_id_seq"'::regclass);


--
-- Name: AboutValues id; Type: DEFAULT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."AboutValues" ALTER COLUMN id SET DEFAULT nextval('core."AboutValues_id_seq"'::regclass);


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
-- Data for Name: AboutPages; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."AboutPages" (id, slug, "heroLabel", "heroTitle", "heroHighlight", "heroSubtitle", "heroImageUrl", "heroImagePublicId", "introTitle", "introHighlight", "introText", "introImageUrl", "introImagePublicId", "stat1Value", "stat1Label", "stat2Value", "stat2Label", "stat3Value", "stat3Label", "missionTitle", "missionText", "missionImageUrl", "missionImagePublicId", "visionTitle", "visionText", "visionImageUrl", "visionImagePublicId", "valuesTitle", "valuesText", "valuesImageUrl", "valuesImagePublicId", "ctaTitle", "ctaText", "ctaAddress", "ctaPhone", "ctaPrimaryButtonText", "ctaPrimaryButtonLink", "ctaSecondaryButtonText", "ctaSecondaryButtonLink", "isActive", "createdAt", "updatedAt") FROM stdin;
1	main	Nuestra Historia	Acerca de Nosotros	Sobre Nosotros	Somos mas que un gimnasio, somos una comunidad comprometida con tu bienestar fisico y emocional.	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774426751/titanium/about/yvp3cy4x6hhg6bia2gim.jpg	titanium/about/yvp3cy4x6hhg6bia2gim	Nuestra Pasion por el Fitness	Motivación	En Titanium Sport Gym, hemos creado un espacio donde cada persona puede alcanzar su maximos potencial.	\N	\N	500+	Miembros Activos	15+	Entrenadores Certificados	00	Horario de Servicio	Mision		https://res.cloudinary.com/dqf9pdcte/image/upload/v1774426652/titanium/about/txjgc0wankcshaq9abd7.jpg	titanium/about/txjgc0wankcshaq9abd7	Vision		\N	\N	Valores		\N	\N	Listo para transformar tu vida?	Unete a nuestra comunidad y comienza tu viaje hacia una vida mas saludable y activa.	Av. Corona del Rosal N 15. Col. 5 de mayo. Huejutla, Hidalgo Mexico.	771 197 6803	Contactanos	/contacto	Ver Servicios	/servicios	t	2026-03-25 07:34:58.451+00	2026-03-25 08:22:12.173+00
\.


--
-- Data for Name: AboutTeamMembers; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."AboutTeamMembers" (id, "aboutPageId", name, role, description, "imageUrl", "imagePublicId", "facebookUrl", "twitterUrl", "linkedinUrl", "order", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AboutValues; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."AboutValues" (id, "aboutPageId", title, description, "iconKey", "order", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


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
12	12	Marca IAST 1	t	6	2026-03-22 06:10:11.505+00	2026-03-22 06:10:11.505+00
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
6	6	Categoria IAST 1	t	2026-03-22 05:53:49.106+00	2026-03-22 05:53:49.106+00
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
86	16	Guantes de entrenamiento Nike	10	4	420.00	10	Activo	\N	Ropa	Guantes deportivos que mejoran el agarre y protegen las manos durante el levantamiento de pesas.	["Antideslizantes y transpirables"]	\N	\N	\N	CH / M / G	Negro	Poliéster / Spandex	2026-03-12 22:16:59.406+00	2026-03-12 22:16:59.406+00
87	17	Tennis Prueba	11	5	1500.00	100	Activo	\N	Ropa	Prueba	[]	\N	\N	\N	M	Azul	Algodon	2026-03-16 23:33:59.63+00	2026-03-16 23:33:59.63+00
100	23	Proteina	1	1	300.00	8	Activo	\N	Suplementación	prueba xss	["seguro"]	Vainilla	900 g	28	\N	\N	\N	2026-03-24 06:40:35.833+00	2026-03-24 06:40:35.833+00
90	18	Bandas de resistencia Life Fitnness	9	4	449.00	6	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433344/titanium/products/pyxtlxrveaalp7baoa60.jpg	Ropa	Bandas elásticas ideales para entrenamiento funcional, calentamiento o rehabilitación.	["Diferentes niveles de resistencia"]	\N	\N	\N	Única	Negro	Azul / Negro	2026-03-19 18:12:48.286+00	2026-03-25 10:09:05.278+00
91	19	Straps de levantamiento Harbinger	9	4	500.00	5	Activo	\N	Ropa	Correas de levantamiento que ayudan a mejorar el agarre en ejercicios como peso muerto o remo.	[]	\N	\N	\N	Única	Negro	Piel	2026-03-19 18:17:17.416+00	2026-03-19 18:17:17.416+00
98	22	Producto IAST Invalido	12	6	-1500.00	-50	Inactivo	\N	Ropa	Producto de prueba Invalido	[]	\N	\N	\N	M	Negro	Algodon	2026-03-22 06:25:16.69+00	2026-03-25 05:45:40.949+00
13	13	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773351955/titanium/products/zt0vkaawatodqdlwh0jr.jpg	Ropa	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 05:21:21.945547+00	2026-03-25 05:45:56.676+00
97	21	Producto IAST 1	12	6	1500.00	50	Activo	\N	Ropa	Producto de prueba IAST	[]	\N	\N	\N	M	Negro	Algodon	2026-03-22 06:19:31.104+00	2026-03-22 06:19:31.104+00
85	15	Cinturón de levantamiento Reebok	8	4	650.00	5	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433425/titanium/products/fvxiecu48lqqsf2z0ogn.jpg	Ropa	Cinturón de gimnasio diseñado para proteger la zona lumbar durante ejercicios de fuerza como peso muerto o sentadilla	["Soporte lumbar reforzado"]	\N	\N	\N	M / G	Negro / Rojo	Cuero sintético	2026-03-12 22:14:08.377+00	2026-03-25 10:10:27.952+00
96	20	Cinturón de pesas Gymreapers	8	4	390.00	12	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433484/titanium/products/bu2qdwjfqhovupyomvfm.jpg	Ropa	Guantes diseñados para mejorar el agarre y reducir ampollas durante el entrenamiento.	["Palma acolchada"]	\N	\N	\N	CH / M / G	Negro / Gris	Poliéster	2026-03-19 18:21:25.094+00	2026-03-25 10:11:26.804+00
4	4	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773308505/titanium/products/gijycqnyokjl4almgx0f.jpg	Ropa	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 05:21:21.945547+00	2026-03-12 09:41:45.813+00
11	11	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773310154/titanium/products/anb6jws0dpedg7lsjdee.jpg	Ropa	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 05:21:21.945547+00	2026-03-12 10:09:15.026+00
46	14	Sudadera Alo	7	3	1110.00	10	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773337807/titanium/products/yr00hgjzp2bslrcnaid3.jpg	Ropa	Sudadera comoda	["Comodo","Fresco"]	\N	\N	\N	M	Negro	Poliester	2026-03-12 17:50:08.201+00	2026-03-12 17:50:08.201+00
9	9	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773351971/titanium/products/rhqu3nqb2oxbjjjxjs7d.jpg	Ropa	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 05:21:21.945547+00	2026-03-12 21:46:11.862+00
\.


--
-- Data for Name: UserCalorieHistory; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."UserCalorieHistory" (id, "userId", "recordDate", "dailyCalories", "nextAllowedDate", "createdAt", "updatedAt") FROM stdin;
675c9d14-fe19-43aa-9b7c-a93bc663a26a	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-26	2000	2026-04-02	2026-03-26 06:56:11.613+00	2026-03-26 06:56:11.613+00
\.


--
-- Data for Name: UserProfiles; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."UserProfiles" (id, "userId", age, gender, height, "initialWeight", "targetWeight", "startDate", "weeklyGymDays", "activityLevel", "fitnessGoal", "createdAt", "updatedAt") FROM stdin;
d6aae7da-dfee-449c-8da3-59fe97e99e5d	9b991004-40dc-499d-ab73-7a5edc57d7dc	25	male	1.75	80.00	70.00	2026-03-20	7	moderate	lose	2026-03-26 06:25:29.768+00	2026-03-26 06:25:29.768+00
\.


--
-- Data for Name: UserWeightHistory; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."UserWeightHistory" (id, "userId", "recordDate", weight, "nextAllowedDate", "createdAt", "updatedAt") FROM stdin;
1cc39c12-a05b-4243-a6d5-2226c9266384	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-26	80.00	2026-04-02	2026-03-26 06:56:27.559+00	2026-03-26 06:56:27.559+00
899cc78b-1a74-42f1-97b5-9eb104f98637	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-19	85.00	2026-02-26	2026-03-26 07:00:38.609242+00	2026-03-26 07:00:38.609242+00
5309e057-2826-473e-a771-6018c95848cd	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-26	84.00	2026-03-05	2026-03-26 07:00:38.609242+00	2026-03-26 07:00:38.609242+00
920da35a-fb67-4102-939d-5650624724cf	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-05	83.00	2026-03-12	2026-03-26 07:00:38.609242+00	2026-03-26 07:00:38.609242+00
bcb17ffe-3017-4134-ad7f-ab1760d52e66	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-12	82.00	2026-03-19	2026-03-26 07:00:38.609242+00	2026-03-26 07:00:38.609242+00
b38f69f4-9d94-48ca-8f59-b93a1cdc6816	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-19	81.00	2026-03-26	2026-03-26 07:00:38.609242+00	2026-03-26 07:00:38.609242+00
\.


--
-- Data for Name: Users; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."Users" (id, email, password, otp, "otpExpires", "isVerified", "isPendingApproval", "accessToken", "totpSecret", "authMethod", role, provider, "providerId", "passwordChangesCount", "passwordChangesDate", "createdAt", "updatedAt") FROM stdin;
e2b8251c-a695-40d9-aafc-5cd838525c53	admin@titanium.com	$2b$10$m1NFF4wNJ/gTrXzz2Cw3telkpHFBFsfTFeHJplMR07157oSQJcTJy	\N	\N	t	f	\N	\N	normal	administrador	local	\N	0	\N	2026-03-04 05:02:30.840499+00	2026-03-04 05:02:30.840499+00
ef71c219-0144-4c1f-903e-16cf0f2d4c88	entrenador@titanium.com	$2b$10$OrM2nfSKlIxQpiJ/VElFsOZxWKUi4dnF3hqUcYLdUDKJFuG8w1ovK	\N	\N	t	f	\N	\N	normal	entrenador	local	\N	0	\N	2026-03-22 18:23:24.35+00	2026-03-22 18:23:24.35+00
9b991004-40dc-499d-ab73-7a5edc57d7dc	cliente@titanium.com	$2b$10$vnERiv/c9kwMMq9bagipH.bUR6t3ZJ8UkTUGy6YmKO17ZE/wV7rJC	\N	\N	t	f	\N	\N	normal	cliente	local	\N	0	\N	2026-03-22 18:23:24.613+00	2026-03-22 18:23:24.613+00
ec96ac21-803c-420b-b329-b8a77ae379dc	castrorosajm@gmail.com	$2b$10$g49tZJxHUd7bXH9KBAHv7.b53EPkj5gIy9Mc.eCH/wMzGx6r4ixay	\N	\N	t	f	\N	\N	normal	cliente	local	\N	0	\N	2026-03-19 07:56:53.047+00	2026-03-19 07:56:53.047+00
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
14	18	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433344/titanium/products/pyxtlxrveaalp7baoa60.jpg	0	titanium/products/pyxtlxrveaalp7baoa60	2026-03-25 10:09:05.105+00	2026-03-25 10:09:05.105+00	t
15	15	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433425/titanium/products/fvxiecu48lqqsf2z0ogn.jpg	0	titanium/products/fvxiecu48lqqsf2z0ogn	2026-03-25 10:10:26.102+00	2026-03-25 10:10:26.102+00	t
16	15	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433426/titanium/products/ie3jcagadiueqzhcfc04.jpg	1	titanium/products/ie3jcagadiueqzhcfc04	2026-03-25 10:10:27.849+00	2026-03-25 10:10:27.849+00	t
17	20	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433484/titanium/products/bu2qdwjfqhovupyomvfm.jpg	0	titanium/products/bu2qdwjfqhovupyomvfm	2026-03-25 10:11:24.651+00	2026-03-25 10:11:24.651+00	t
18	20	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433485/titanium/products/mu55blqhu6ktiggsl9xv.jpg	1	titanium/products/mu55blqhu6ktiggsl9xv	2026-03-25 10:11:26.705+00	2026-03-25 10:11:26.705+00	t
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
8bd55159-7053-4819-8b63-f0f7b685ec3a	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczOTA0NjIwLCJleHAiOjE3NzM5MDgyMjB9.P0kSAgkgbVdTI7N0sygfhqyMDEjZDF6Y1hgBNDxj3mk	2026-03-19 08:17:00.493+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 07:17:00.494+00	2026-03-19 07:17:00.494+00
221d7da2-0d9c-40db-beb3-82be89a78e9c	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczOTA1MzkyLCJleHAiOjE3NzM5MDg5OTJ9.iSlpf9do4Hn-4gudFKckmWVX6NvNBdYOD-PrUAXjOcc	2026-03-19 08:29:52.42+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 07:29:52.421+00	2026-03-19 07:29:52.421+00
d26834c8-2297-4a25-b905-901cc6729519	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczOTA1NTQwLCJleHAiOjE3NzM5MDkxNDB9.FKgwISK4lnsXL4SMRNF36yenvJD3HiCCXu3nU903Pls	2026-03-19 08:32:20.233+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0	::1	2026-03-19 07:32:20.237+00	2026-03-19 07:32:20.237+00
322ac561-feb5-4807-b84e-ee9c7fe28122	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczOTA2MzUyLCJleHAiOjE3NzM5MDk5NTJ9.ue5H__CA_f9z7JERTwkPlaQWidkfgnh0_v2i6bM11Zs	2026-03-19 08:45:52.797+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 07:45:52.798+00	2026-03-19 07:45:52.798+00
fd26a283-f1d3-4fbd-a603-8abcf5a39a48	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczOTQzNDc3LCJleHAiOjE3NzM5NDcwNzd9.Kj_R4cRBRL-piWarq8UAEuIr_Fd-fjMu-N24i_WmjAA	2026-03-19 19:04:37.65+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 18:04:37.651+00	2026-03-19 18:04:37.651+00
f0f55b9d-e590-4fe2-96ce-531acc00ea78	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczOTQ0Mzc5LCJleHAiOjE3NzM5NDc5Nzl9.T92cPMhSrNKqw9xOpbSCccagpgccjtT2u9XFyQ-e28s	2026-03-19 19:19:39.297+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 18:19:39.297+00	2026-03-19 18:19:39.297+00
e3371a7a-484b-4dce-86d8-d2adfc5600a2	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczOTQ3MTQyLCJleHAiOjE3NzM5NTA3NDJ9.OWrNULqeEcJr20-N6D7LpbP0FD4QPD5scpTl2UMN0wY	2026-03-19 20:05:42.977+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 19:05:42.978+00	2026-03-19 19:05:42.978+00
d27c1893-88d9-498e-9ac8-b414ceeca9c1	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczOTQ5NzA3LCJleHAiOjE3NzM5NTMzMDd9.Bs9TvcJPcio_xEea3DFCbu5qDKt9VTWPwm9rNDXIYik	2026-03-19 20:48:27.898+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 19:48:27.899+00	2026-03-19 19:48:27.899+00
e0ce313b-d890-442a-b176-2c593fa0775f	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzczOTU2Mzg1LCJleHAiOjE3NzM5NTk5ODV9.3hEFu9r6DZM0iDxxWdKRR60n7mm3xJXVEiHQTqxZKp8	2026-03-19 22:39:45.786+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-19 21:39:45.788+00	2026-03-19 21:39:45.788+00
5047edbc-3f91-45f4-a406-77014f4f534b	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MDQ0NzA0LCJleHAiOjE3NzQwNDgzMDR9.ayN91Dfz3qaO0bOdhMwkJeAF2aWaup-7_YeNjKKeOWM	2026-03-20 23:11:44.607+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-20 22:11:44.609+00	2026-03-20 22:11:44.609+00
3939e782-576f-4e9d-b30c-8060c8199e28	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MDQ0OTEyLCJleHAiOjE3NzQwNDg1MTJ9.MaQmWmLPbDnaGGPAO3hHH-0HkGOltQNUjYerOP2Rp1A	2026-03-20 23:15:12.64+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-20 22:15:12.641+00	2026-03-20 22:15:12.641+00
5491d5da-7dc7-4395-8cfe-2bf75c4b2d58	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MDQ1NTcyLCJleHAiOjE3NzQwNDkxNzJ9.JoRWsqMHvls6V-FjvW62pSumW_3Cm0qN3bwh0HDUhDM	2026-03-20 23:26:12.539+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-20 22:26:12.539+00	2026-03-20 22:26:12.539+00
b6a2c124-2375-4687-b870-2427cd9d753c	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MDQ1ODk3LCJleHAiOjE3NzQwNDk0OTd9._3yG9iZzGKtfl6nqqJVRmfMo6d9-Hzz27wbyY-94nfU	2026-03-20 23:31:37.149+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0	::1	2026-03-20 22:31:37.15+00	2026-03-20 22:31:37.15+00
75354680-6941-464d-aaf5-1bcde034d50d	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MTU4MDc5LCJleHAiOjE3NzQxNjE2Nzl9.2n3ECufAyxTTQ8jJhO4IjSx7n1biSiD9Sgad5d-HEus	2026-03-22 06:41:19.721+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-22 05:41:19.723+00	2026-03-22 05:41:19.723+00
d91ecea9-c055-4a42-a4c3-109f07265ce8	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MTU5Njg5LCJleHAiOjE3NzQxNjMyODl9.QWE5cSN5lR5HtZB--fE1vfK8BQGggtsqu5suqLAPKvA	2026-03-22 07:08:09.837+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-22 06:08:09.838+00	2026-03-22 06:08:09.838+00
acbed4b6-dee2-4d2b-b27c-a30ed373d0aa	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MTYwODU1LCJleHAiOjE3NzQxNjQ0NTV9.BVNPUP9JfUp1AAYxBSMHTuodetBEP-MScYMfTJn92UI	2026-03-22 07:27:35.042+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-22 06:27:35.042+00	2026-03-22 06:27:35.042+00
73e1c235-c7a7-462a-8722-339b8e010e4c	ef71c219-0144-4c1f-903e-16cf0f2d4c88	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVmNzFjMjE5LTAxNDQtNGMxZi05MDNlLTE2Y2YwZjJkNGM4OCIsInJvbGUiOiJlbnRyZW5hZG9yIiwiZW1haWwiOiJlbnRyZW5hZG9yQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQyMDM4NTEsImV4cCI6MTc3NDIwNzQ1MX0.Gsjv_8e28Kep4XhX18JCuvzBSdVtKqKpTAaoQyy-O40	2026-03-22 19:24:11.19+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-22 18:24:11.191+00	2026-03-22 18:24:11.191+00
39982967-0efc-4321-ac3e-2af404ffab61	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQyMDM4NjcsImV4cCI6MTc3NDIwNzQ2N30.JfvqjXZ3ljT2kDS3gmt2_PWy7TtWrYlMXLbicldO9gE	2026-03-22 19:24:27.904+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-22 18:24:27.904+00	2026-03-22 18:24:27.904+00
6c0140d9-a85c-469b-a4d5-2b0ed5049bb4	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjMwNzUzLCJleHAiOjE3NzQyMzQzNTN9.buIFStbTHQlIfiW2YIIbSCxzWe6ZebtB3DVVzJbUgUI	2026-03-23 02:52:33.319+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 01:52:33.32+00	2026-03-23 01:52:33.32+00
fd3121ea-82c5-48f2-bba3-cf03ad0abf14	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjMwODg4LCJleHAiOjE3NzQyMzQ0ODh9.AIiK2EK21biXdq0uzGE99P351b4qMGLp6xNpq17NYuA	2026-03-23 02:54:48.778+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 01:54:48.779+00	2026-03-23 01:54:48.779+00
f3a3dd47-9026-4122-9feb-be86f5d02261	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjM0MTkzLCJleHAiOjE3NzQyMzc3OTN9.pKWB8lnWnfQr221cKdMkaevI3b9v9j_JKJuvBCnlrfQ	2026-03-23 03:49:53.343+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 02:49:53.343+00	2026-03-23 02:49:53.343+00
f6a44305-de4d-4284-9401-b06f5db0b2c3	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjM0NDAxLCJleHAiOjE3NzQyMzgwMDF9.zN_hnZ0zStNNI4Sr3opZN8RIEg3WKxWYjb8QIP0NOrs	2026-03-23 03:53:21.172+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 02:53:21.176+00	2026-03-23 02:53:21.176+00
e34e747f-cada-4b57-8ccb-fa2966514bb8	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjM0NDA2LCJleHAiOjE3NzQyMzgwMDZ9.8__Sr9zua3ZiX9_y3b9Bg6ktB6PnfQDZvJjXpww2kOk	2026-03-23 03:53:26.097+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 02:53:26.097+00	2026-03-23 02:53:26.097+00
ea608524-2d72-4ec8-9ee3-159daa68e546	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjM0ODExLCJleHAiOjE3NzQyMzg0MTF9.PTnSaaPcDRdY0AUUGz0JO2Mhzb4zPEmmr5vjA6I8amo	2026-03-23 04:00:11.272+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 03:00:11.273+00	2026-03-23 03:00:11.273+00
c72bd175-fd9f-45be-9702-5d535d5c7c87	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjM3ODgxLCJleHAiOjE3NzQyNDE0ODF9.Yx_w_cwsyLxZKoQ7_Ebl6igzgBb9ZLbLez5xDrOMAC0	2026-03-23 04:51:21.315+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 03:51:21.316+00	2026-03-23 03:51:21.316+00
3098f31d-1902-458c-bcbd-157fc769c264	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjQwMTc2LCJleHAiOjE3NzQyNDM3NzZ9.uBrLmsn96zfxaDcyM_ce7zKRx4YD7EEXbcWLOFhzLQk	2026-03-23 05:29:36.03+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 04:29:36.031+00	2026-03-23 04:29:36.031+00
0583a5f8-2537-4bc9-b9d4-169d2a2001c5	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjQxNDk2LCJleHAiOjE3NzQyNDUwOTZ9.xr7H_GKAn2TJmxo_W0Ly3qK5my_fw8avgtOqKa-lnQE	2026-03-23 05:51:36.718+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 04:51:36.719+00	2026-03-23 04:51:36.719+00
c9491c7a-7709-48b6-9796-df34882df282	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjQyNDMzLCJleHAiOjE3NzQyNDYwMzN9.AJO740WcVjOcs9uEWhifZVRaWBU1uvCkqGzAZHlzw94	2026-03-23 06:07:13.623+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 05:07:13.624+00	2026-03-23 05:07:13.624+00
67094200-3685-42f5-8e5c-4e74d3791f22	ef71c219-0144-4c1f-903e-16cf0f2d4c88	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVmNzFjMjE5LTAxNDQtNGMxZi05MDNlLTE2Y2YwZjJkNGM4OCIsInJvbGUiOiJlbnRyZW5hZG9yIiwiZW1haWwiOiJlbnRyZW5hZG9yQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQyNDI1MDIsImV4cCI6MTc3NDI0NjEwMn0.UGIFIWO-04hU5aCpRO8Hndq5ghHIS8wmo57KHvTuzRg	2026-03-23 06:08:22.015+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 05:08:22.015+00	2026-03-23 05:08:22.015+00
e6f32b2b-2499-4b81-a764-c69d931c20b3	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQyNDI1MjksImV4cCI6MTc3NDI0NjEyOX0.7FzHt75zOFk9PylWQgu41zvi2aPHMOo3zWCrIZPzzQY	2026-03-23 06:08:49.895+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 05:08:49.895+00	2026-03-23 05:08:49.895+00
cdad4d71-9491-4e42-b251-9accc66af2f7	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjQyNzU2LCJleHAiOjE3NzQyNDYzNTZ9.vkePounkRn0_uhtLk8vNF5VPzbTDkc9mUVfy0ZCzjxs	2026-03-23 06:12:36.604+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 05:12:36.604+00	2026-03-23 05:12:36.604+00
3e0e8bce-570e-4aaa-ac07-fc19f5beeb8e	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjQ0MDk2LCJleHAiOjE3NzQyNDc2OTZ9.yio_a1laAQSKeRKrFYGOGuRUdYx94QXv6hvjPp-QYW4	2026-03-23 06:34:56.401+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 05:34:56.402+00	2026-03-23 05:34:56.402+00
1d061134-e51d-41c9-aeba-394832646fbe	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjQ3MzI5LCJleHAiOjE3NzQyNTA5Mjl9.sBpj_BbhklSzv-BTXgQt1ihQIRrhfX1I_zHMGWj2QtU	2026-03-23 07:28:49.769+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 06:28:49.77+00	2026-03-23 06:28:49.77+00
fcef93fc-a3b3-44d0-93ea-a73d11439cd2	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjQ3NTczLCJleHAiOjE3NzQyNTExNzN9.cFzS8SymoPtg9tz-1Et16xFULj5VO7uvNjqdnqhjNcI	2026-03-23 07:32:53.951+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 06:32:53.951+00	2026-03-23 06:32:53.951+00
fa4d13b2-0bb9-4c67-9e90-dbeb613d57db	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQyNTA4MjAsImV4cCI6MTc3NDI1NDQyMH0.VNlIFTiKm2s5VGQZ12596f7h8JbWPkfLUuPtD2UrjwA	2026-03-23 08:27:00.066+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 07:27:00.067+00	2026-03-23 07:27:00.067+00
e1890f2f-fa68-4396-a55d-bd5084acd301	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjUwODY5LCJleHAiOjE3NzQyNTQ0Njl9.M_mz_IBA-o4FH1n9Fkjxf0nOg2VCfZIUQHR1r2DbJP0	2026-03-23 08:27:49.117+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 07:27:49.117+00	2026-03-23 07:27:49.117+00
bde86d06-7611-40c8-af43-cd257b9c909f	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MjUwODc5LCJleHAiOjE3NzQyNTQ0Nzl9.2iDypvza6t89YcSq1g7O_mNYIk6Ju3j6s_ZQz7PvNqo	2026-03-23 08:27:59.719+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 07:27:59.72+00	2026-03-23 07:27:59.72+00
01456144-8217-4944-a656-8f5d91207abc	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQyNTA4OTMsImV4cCI6MTc3NDI1NDQ5M30.-LRSgWBJFkxeblTxsTKyif-fTctNlsoWURT_oF-yG4w	2026-03-23 08:28:13.294+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-23 07:28:13.294+00	2026-03-23 07:28:13.294+00
e350cbb4-ec8b-4adc-b6ca-f6b4c04f7c14	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzMzI4MDUsImV4cCI6MTc3NDMzNjQwNX0.aJL2L2apR61akcsRVh6WFoARjb0oMa-70_1PmnjSfSI	2026-03-24 07:13:25.827+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 06:13:25.828+00	2026-03-24 06:13:25.828+00
1172d781-3c34-4fa1-8b77-0ef1525557e1	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MzMzNjkwLCJleHAiOjE3NzQzMzcyOTB9.hkkMnP_rAvTY_N1I058_h3MmZ8vN6-ILWBVEkqheoNs	2026-03-24 07:28:10.739+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 06:28:10.74+00	2026-03-24 06:28:10.74+00
603e006c-27dc-4177-8bdb-d78fdf075170	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MzMzOTA1LCJleHAiOjE3NzQzMzc1MDV9.jkNAVwdpZKIQqWpU5We1uRqLUv2GeFrE7-SUKLZrhYc	2026-03-24 07:31:45.619+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 06:31:45.619+00	2026-03-24 06:31:45.619+00
3e2513d2-9a6e-48de-8d24-b99bb744b076	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MzQxODI3LCJleHAiOjE3NzQzNDU0Mjd9.geCPqR_aGd00JPa5MvmgDtIWDvCjanWQ9DzINfCHun8	2026-03-24 09:43:47.202+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 08:43:47.205+00	2026-03-24 08:43:47.205+00
ab2b88fd-8bf3-44b5-905f-6de338659387	ef71c219-0144-4c1f-903e-16cf0f2d4c88	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVmNzFjMjE5LTAxNDQtNGMxZi05MDNlLTE2Y2YwZjJkNGM4OCIsInJvbGUiOiJlbnRyZW5hZG9yIiwiZW1haWwiOiJlbnRyZW5hZG9yQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNDE4NjcsImV4cCI6MTc3NDM0NTQ2N30.YMNqlnIeOJpsLiWtkaqgGF3s_J9vw1_DXDlACPYEVIY	2026-03-24 09:44:27.96+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 08:44:27.96+00	2026-03-24 08:44:27.96+00
e9e4bde3-72a6-4703-821a-0d99c31cd3de	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNDE4OTcsImV4cCI6MTc3NDM0NTQ5N30.R8kvHAulmvsdEAs-CkM9Ptu07QnY8Sjx1PiOfdaeqFg	2026-03-24 09:44:57.288+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 08:44:57.293+00	2026-03-24 08:44:57.293+00
7a9118a2-0e8d-40db-be2f-dc4f0a3df8a9	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MzQyMDc2LCJleHAiOjE3NzQzNDU2NzZ9.OuaMSfl5mpkhknVV8hhq8rMkl53fMrGD8ihJ5vt52bo	2026-03-24 09:47:56.332+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 08:47:56.332+00	2026-03-24 08:47:56.332+00
9b73a910-ca69-4295-8d71-f1730360e224	ef71c219-0144-4c1f-903e-16cf0f2d4c88	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVmNzFjMjE5LTAxNDQtNGMxZi05MDNlLTE2Y2YwZjJkNGM4OCIsInJvbGUiOiJlbnRyZW5hZG9yIiwiZW1haWwiOiJlbnRyZW5hZG9yQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNDQwNDIsImV4cCI6MTc3NDM0NzY0Mn0.K9bxvi9lcrx6gxt5kZamwReeyb9axQHdr8a9Sb3MuK0	2026-03-24 10:20:42.641+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 09:20:42.643+00	2026-03-24 09:20:42.643+00
121140bf-7209-4236-9991-9e3080e084e8	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNDQwNjQsImV4cCI6MTc3NDM0NzY2NH0.UCf0Z7aM6P043LewBIOUP-d7ZjqOYx3jFcDRswFEqsU	2026-03-24 10:21:04.382+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 09:21:04.382+00	2026-03-24 09:21:04.382+00
c49011b2-3a3a-450f-a710-06379e1a723b	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MzQ0MTYwLCJleHAiOjE3NzQzNDc3NjB9.i2I1imlze3HpEGeU88Fu6_TibxHcPgPpZLJuE-NuRmg	2026-03-24 10:22:40.461+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 09:22:40.461+00	2026-03-24 09:22:40.461+00
3d1056c8-62e1-42b6-8ba7-db21e7f790c9	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MzQ0MjYzLCJleHAiOjE3NzQzNDc4NjN9.aXq7RFavStCbRI2Z7XY96zlrpfL4E3TolrLrtCg6KNc	2026-03-24 10:24:23.005+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 09:24:23.005+00	2026-03-24 09:24:23.005+00
07735815-d53f-4985-965b-299a13fd8d71	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MzQ1MTYxLCJleHAiOjE3NzQzNDg3NjF9.QvT0CIi1zlrDlAShKCWirJbL9uhVjNfECdC5mdXbs_c	2026-03-24 10:39:21.331+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 09:39:21.331+00	2026-03-24 09:39:21.331+00
e7b3bf20-3732-4df0-8b4b-3d6ed892a7a5	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNDUyMzQsImV4cCI6MTc3NDM0ODgzNH0.G87SOkFJa4tdwiwwN6WUoNjbVYq997KOtgKmoRjCoFc	2026-03-24 10:40:34.979+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	2026-03-24 09:40:34.981+00	2026-03-24 09:40:34.981+00
0ea25053-5393-48fa-a4e8-74aec636e40a	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNDU0NTEsImV4cCI6MTc3NDM0OTA1MX0.AW3hqb4F9Ih_4_w0KtwuGErk80NgRh8_UyKrt5DJoS4	2026-03-24 10:44:11.078+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 09:44:11.079+00	2026-03-24 09:44:11.079+00
9cc37622-3e44-4012-b8a6-8184f8d5645b	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MzQ2MjgzLCJleHAiOjE3NzQzNDk4ODN9.uCDnTPafTVOXur4jJV-HNRQ7nobYmXRTqR2iCKWE-8E	2026-03-24 10:58:03.635+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 09:58:03.635+00	2026-03-24 09:58:03.635+00
baeff9ee-d89a-45b3-9d8f-29bd22425500	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MzQ2MzUyLCJleHAiOjE3NzQzNDk5NTJ9.WGL44jf6u9-aN6YXWdVi1xTA2Uxae9J3jmV3FSxsRCU	2026-03-24 10:59:12.304+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 09:59:12.304+00	2026-03-24 09:59:12.304+00
a4dfd41a-f025-4b5a-874f-9c750849c6fe	ef71c219-0144-4c1f-903e-16cf0f2d4c88	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVmNzFjMjE5LTAxNDQtNGMxZi05MDNlLTE2Y2YwZjJkNGM4OCIsInJvbGUiOiJlbnRyZW5hZG9yIiwiZW1haWwiOiJlbnRyZW5hZG9yQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNDcwOTIsImV4cCI6MTc3NDM1MDY5Mn0.BIkRRGYUUNl0KPsJV0GKL00USl_vNT7pDueCtbpxeY4	2026-03-24 11:11:32.794+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 10:11:32.794+00	2026-03-24 10:11:32.794+00
81173c89-c651-4886-839e-23cb9f2db288	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MzQ3MTM2LCJleHAiOjE3NzQzNTA3MzZ9.2Ly8MtyfiTRsLPh26k3HkhTfS38W0LI6e4U-K1-rwjc	2026-03-24 11:12:16.296+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 10:12:16.297+00	2026-03-24 10:12:16.297+00
55a813dc-bd6c-4df4-b420-2c37293717ea	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNDkxNzMsImV4cCI6MTc3NDM1Mjc3M30.hOo09QA1AVsuU0ufxa6xyCYSW3fLvNH_9l9V5WnPyw8	2026-03-24 11:46:13.653+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 10:46:13.653+00	2026-03-24 10:46:13.653+00
22437f3c-e5c3-46f3-9c06-1cf9bd65718e	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNTAzMTIsImV4cCI6MTc3NDM1MzkxMn0.SbrVz8vCWY7MkAFXYPWvJY9SqA8_b0TRnh8fdHpfruA	2026-03-24 12:05:12.974+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 11:05:12.974+00	2026-03-24 11:05:12.974+00
9c23ae13-ee61-4f84-ac25-4947bec2e872	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MzUwODUxLCJleHAiOjE3NzQzNTQ0NTF9.IOgMwDAYLzp0boo-lBMJOmjpLz_GoZmyhObUM9OMJyY	2026-03-24 12:14:11.045+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 11:14:11.045+00	2026-03-24 11:14:11.045+00
43b24bac-c255-4dde-bd1a-54d0a5601b9a	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNTQwOTEsImV4cCI6MTc3NDM1NzY5MX0.hm1OHjljQGGi8N_XqGzM3y3kJTujJOAiNcRr22lLgtI	2026-03-24 13:08:11.245+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 12:08:11.246+00	2026-03-24 12:08:11.246+00
bf02cf3e-8765-43e8-b43e-8f3f0fce75b4	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNTQ1NTEsImV4cCI6MTc3NDM1ODE1MX0.eNSSieEILUo8D9J8bPJqEPG1zFj4HbGe4WlWdaKr_ug	2026-03-24 13:15:51.13+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 12:15:51.131+00	2026-03-24 12:15:51.131+00
e41e6973-13fa-47e8-959d-28e68cb024fd	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0MzU3Mjc2LCJleHAiOjE3NzQzNjA4NzZ9.3GdMrWhm4fpxGpPsfudOTvHEAkQXpFAVwZX8zYGeD2k	2026-03-24 14:01:16.876+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 13:01:16.876+00	2026-03-24 13:01:16.876+00
99e98232-b8f8-4f1e-957f-24353256379c	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNTg5ODEsImV4cCI6MTc3NDM2MjU4MX0.bhETnqVEtS2TU-qCex5ZSuXxUQMWX2So4drBZG8OUMk	2026-03-24 14:29:41.648+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 13:29:41.649+00	2026-03-24 13:29:41.649+00
e70d92fe-0114-4b74-a0a0-449fab5049ab	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNjE0ODEsImV4cCI6MTc3NDM2NTA4MX0.2nBu_3GGJeBzI8kuvzSKormVBc0O7BR8yHxnx8JzwAY	2026-03-24 15:11:21.523+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 14:11:21.524+00	2026-03-24 14:11:21.524+00
3aeebd76-ae9c-4bfc-bfc6-7bbecc734ffc	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQzNjM0MjIsImV4cCI6MTc3NDM2NzAyMn0.WFk_bH1gqZnXnNLb53tOjU7eR-WuRGkmzD2wVqTzerc	2026-03-24 15:43:42.129+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-24 14:43:42.13+00	2026-03-24 14:43:42.13+00
bfa531cf-144f-4d8f-8795-945c26a9c240	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NDE3NTI5LCJleHAiOjE3NzQ0MjExMjl9.WzVg_XleK5UUZ_EBrs-Go2Cd0uElOUthSxJ_yD6yaGI	2026-03-25 06:45:29.668+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 05:45:29.669+00	2026-03-25 05:45:29.669+00
02714e83-02ae-4b6c-be6e-a428f2bae191	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0MTg1NTgsImV4cCI6MTc3NDQyMjE1OH0.JwQl0HmhQ1UB9EbKsSFA1fSLWkEXIWU4RiOMMJNd1GE	2026-03-25 07:02:38.339+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 06:02:38.34+00	2026-03-25 06:02:38.34+00
8c5ba423-479e-4f7c-905c-ad118777b4df	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NDIwNTI3LCJleHAiOjE3NzQ0MjQxMjd9.FaJh_Oh05NELO4bLKIw89MAFho-qZK1K2FKP5E2TpUk	2026-03-25 07:35:27.539+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 06:35:27.54+00	2026-03-25 06:35:27.54+00
5ea63df3-f2ad-4e78-9004-421181644b1b	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0MjI3ODEsImV4cCI6MTc3NDQyNjM4MX0.GC6PQBTrnma30hMvWDLRaoLNMu7qFRDZmxpCvH2I3eM	2026-03-25 08:13:01.938+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 07:13:01.942+00	2026-03-25 07:13:01.942+00
3d9b25ce-b334-4717-9e2c-cc7036c90238	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NDIzMDU5LCJleHAiOjE3NzQ0MjY2NTl9.Kvj_TOA1Ev7qtc0RzCcm3zN3TBrsSGTEdd2tidQ0XGI	2026-03-25 08:17:39.625+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 07:17:39.626+00	2026-03-25 07:17:39.626+00
bd91d406-262e-4ff6-ac54-4b35e2aa7689	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0MjMxMTQsImV4cCI6MTc3NDQyNjcxNH0.lCZiVtVb0n5SkeTS0tzsd1XwhbDcC_pFF6N3m4rOZh0	2026-03-25 08:18:34.782+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 07:18:34.783+00	2026-03-25 07:18:34.783+00
86ccd871-fcb6-421a-867a-3fee85a52d45	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NDI0NDQzLCJleHAiOjE3NzQ0MjgwNDN9.3Nsg0-_1ZyM1pKbWhsR4OxLLrew-9rhCX_J9nnD3wpo	2026-03-25 08:40:43.14+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 07:40:43.14+00	2026-03-25 07:40:43.14+00
ca2a00d9-4c9e-464d-92cc-7cec4c88b0e4	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NDI2NjA1LCJleHAiOjE3NzQ0MzAyMDV9.fn-1ttTS-CIgXRGtNS8FP-Y4VTtujXTZQVQDUADMS6o	2026-03-25 09:16:45.989+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 08:16:45.99+00	2026-03-25 08:16:45.99+00
8f44f788-7905-4cb5-afd9-00a37348b9b9	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NDI2NzEzLCJleHAiOjE3NzQ0MzAzMTN9.ltuC5fiLZtRsqufS23Iii1z7LAUCN_lLPnolKM4rZSk	2026-03-25 09:18:33.288+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 08:18:33.288+00	2026-03-25 08:18:33.288+00
d2f06c3d-3612-4602-808f-b2102d3ff9bc	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NDI2Nzg0LCJleHAiOjE3NzQ0MzAzODR9.HvSt2VfQwWejpQ0ituCPrATzqM9XEIkH3php6DXxsLY	2026-03-25 09:19:44.205+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 08:19:44.205+00	2026-03-25 08:19:44.205+00
f6f80842-015c-4ec3-8948-54422ffbc40a	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0MjcwNjgsImV4cCI6MTc3NDQzMDY2OH0.bC3hbztrTaK_BzH5VhYuje1UwvqvJkXDeQ9D7HxiqLE	2026-03-25 09:24:28.843+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 08:24:28.844+00	2026-03-25 08:24:28.844+00
6482b8b2-dcb4-468a-978e-3313abb3aa03	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0MjgzNzMsImV4cCI6MTc3NDQzMTk3M30.3IO6uI6IIwfQFudBU6weEhbff_tCjJ9JC1dbJQXP6tc	2026-03-25 09:46:13.901+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 08:46:13.901+00	2026-03-25 08:46:13.901+00
e86d1e44-7a18-462e-86e1-c46f1eff6e10	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0Mjg0MDcsImV4cCI6MTc3NDQzMjAwN30.8o-JpF9eOm1YzNTA-Fhb2FZZEd7yUD2dtcjliWz0WeA	2026-03-25 09:46:47.998+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 08:46:47.998+00	2026-03-25 08:46:47.998+00
e1a6cba1-dba8-4872-a414-cd93535d85d8	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0MjkyMTMsImV4cCI6MTc3NDQzMjgxM30.QM8H1hDM8Q4H_p8AvF_dxhGSpRRdE_6EFDe237ffDMk	2026-03-25 10:00:13.967+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 09:00:13.968+00	2026-03-25 09:00:13.968+00
78ce956b-e7f2-4fef-97cb-659953b55e8a	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NDI5MjU0LCJleHAiOjE3NzQ0MzI4NTR9.PGfL7yQrNrONSHlpOxC6xRthL2OacnDCNExenqZvd3I	2026-03-25 10:00:54.331+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 09:00:54.332+00	2026-03-25 09:00:54.332+00
a2342228-2ee6-47a3-95db-5726a2e54b9c	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0MjkzMDIsImV4cCI6MTc3NDQzMjkwMn0.XY2NJDGVC-wcI_sQVTRG22DH_4Z3WDBfQU0WM9jWA0o	2026-03-25 10:01:42.287+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 09:01:42.287+00	2026-03-25 09:01:42.287+00
a7753017-e129-4358-8cf9-5ba6c963d421	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0Mjk0MjUsImV4cCI6MTc3NDQzMzAyNX0.VCmv8iK3lQYSL9stSrQ98hMSYubTi6SOVvNcpQKNd4E	2026-03-25 10:03:45.986+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 09:03:45.986+00	2026-03-25 09:03:45.986+00
c9dae459-f0cc-4229-ae18-e7045516cb40	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NDI5NzQ0LCJleHAiOjE3NzQ0MzMzNDR9.BKolWnnSBQDs2SJtoYzPdiEQCcoKLklS-x6itvj2avU	2026-03-25 10:09:04.718+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 09:09:04.718+00	2026-03-25 09:09:04.718+00
9ae28dee-2852-4f46-9ddf-5c7218ff78ed	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0Mjk5MzYsImV4cCI6MTc3NDQzMzUzNn0.oIpiSj1kZym5PBT7moZslNwyFCpnbtuPneb_G8a5I04	2026-03-25 10:12:16.621+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 09:12:16.623+00	2026-03-25 09:12:16.623+00
44dcf8c6-61cc-45b2-81f3-a2ab27be5755	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0MzA4MDUsImV4cCI6MTc3NDQzNDQwNX0.w-A0Ixf_hxGdU7adSML4k3nXB5lj7XM2bk7iE3zOtWw	2026-03-25 10:26:45.209+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 09:26:45.209+00	2026-03-25 09:26:45.209+00
18cbc899-9278-429d-85c7-31ec594a7d4c	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NDMxOTA4LCJleHAiOjE3NzQ0MzU1MDh9.Kytp0ae1f5zM2v1r4sUMssNTAB3NEBcfH9Vwb2pudzQ	2026-03-25 10:45:08.597+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 09:45:08.597+00	2026-03-25 09:45:08.597+00
95faa78e-cb5a-4220-a3c0-c1225bafd00b	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NDMyNjM4LCJleHAiOjE3NzQ0MzYyMzh9.SnND8a9fy88vz9lwK-Af7L5Zo2yNtJNFfstq3S5d0UI	2026-03-25 10:57:18.864+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 09:57:18.864+00	2026-03-25 09:57:18.864+00
cdf3b4d1-d6da-407d-8a4c-dbe0167eca9c	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NDMzMTMxLCJleHAiOjE3NzQ0MzY3MzF9.sBk6QDm_ubTzX8fvJOW3od2DNClXM7iLPkGuUxJFvxg	2026-03-25 11:05:31.79+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 10:05:31.79+00	2026-03-25 10:05:31.79+00
f49ab160-27d7-46f9-b28e-295c94ee645d	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0MzM2NTksImV4cCI6MTc3NDQzNzI1OX0.1zGTTLs44_JBH3FCRIxCMjjdMRuXk3vF-dG_q-iIA7k	2026-03-25 11:14:19.68+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 10:14:19.68+00	2026-03-25 10:14:19.68+00
dee538b7-c07f-4c3b-8c54-7c63aa03d016	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0Mzc5ODAsImV4cCI6MTc3NDQ0MTU4MH0.8mJMNnM5YzSY489vl4phnA6uFkKa6UlfcXaFhCvS-pU	2026-03-25 12:26:20.009+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 11:26:20.01+00	2026-03-25 11:26:20.01+00
f046f3a5-ca73-47c1-8590-e18e5464edb0	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NDM4MDQ0LCJleHAiOjE3NzQ0NDE2NDR9.aQP9K7BSQK8W-QiYarYT6KRrw8tq4_8kkdNU06ybIJk	2026-03-25 12:27:24.867+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 11:27:24.867+00	2026-03-25 11:27:24.867+00
fc13b4b1-800e-431f-b517-2c50f6a34513	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0MzgxNDgsImV4cCI6MTc3NDQ0MTc0OH0.h9Q-CO_GfQXK97Q3qX0Cgxnsy9rxAL1OMsPccp1L6j4	2026-03-25 12:29:08.983+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 11:29:08.984+00	2026-03-25 11:29:08.984+00
b966521f-2864-4faa-8b8d-feb7c2ee1d1d	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0MzgyMjMsImV4cCI6MTc3NDQ0MTgyM30.SNSftMv_Q94OtVGlN0IScacN21YBfK-tSdSTA7G-wwg	2026-03-25 12:30:23.039+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 11:30:23.039+00	2026-03-25 11:30:23.039+00
db0a6773-0987-4a73-8467-dd3394862758	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0NzQ0MDEsImV4cCI6MTc3NDQ3ODAwMX0.MNTwJhBGep7tAAZRo_4FK6LZm5jEavEJ-762HVjGxpo	2026-03-25 22:33:21.221+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 21:33:21.225+00	2026-03-25 21:33:21.225+00
d8cea152-822f-4c7f-9eff-5338c5f04309	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ0NzQ0NTcsImV4cCI6MTc3NDQ3ODA1N30.Op5fyI0-1joxTl8vbEvw4gnlcLsr_goU5IkOdrJEAdY	2026-03-25 22:34:17.521+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-25 21:34:17.521+00	2026-03-25 21:34:17.521+00
e64e118b-9ae8-43e1-9e45-5792e97cd267	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTAyNTIxLCJleHAiOjE3NzQ1MDYxMjF9.r-TDSH941aYcz_QYSWw-1DY12aeHqeIBIGe1TC7KvLY	2026-03-26 06:22:01.092+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 05:22:01.093+00	2026-03-26 05:22:01.093+00
07d8d17b-916b-4dd9-aff4-ff9eecfa7b68	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MDM0OTAsImV4cCI6MTc3NDUwNzA5MH0._VBLE-ZYTAInvEGqEzTd8S5B5vaVnqvRTr9XyVkB8W8	2026-03-26 06:38:10.839+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 05:38:10.839+00	2026-03-26 05:38:10.839+00
04e4a3fd-17a8-46d5-b428-09a088e4252e	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MDM5NzIsImV4cCI6MTc3NDUwNzU3Mn0.jnDkaL2PtHGp2RhWULvQyX2Yl3oaWai4cs6KU05Q9_A	2026-03-26 06:46:12.867+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 05:46:12.868+00	2026-03-26 05:46:12.868+00
844b3328-9718-4fef-80fe-ff4de10910d1	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MDQwMTksImV4cCI6MTc3NDUwNzYxOX0.0aq732kutcHYauT9W2XIWl2ABM5Ju_k-te4i9KIfsas	2026-03-26 06:46:59.672+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 05:46:59.672+00	2026-03-26 05:46:59.672+00
3d378505-8d6a-4f8f-963f-fbcc1e2b7f49	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MDYxOTMsImV4cCI6MTc3NDUwOTc5M30.XB5qYTQJbUQccT0RTt0idEfhWogkeayJkG9tyGgzsk0	2026-03-26 07:23:13.339+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 06:23:13.34+00	2026-03-26 06:23:13.34+00
67beb6d2-d447-4cbb-845a-7647e008655f	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MDY4ODUsImV4cCI6MTc3NDUxMDQ4NX0.L3Tt8kg92cOF1w6gKu_UjG2CjGkojGk9V5LVq3vMSf0	2026-03-26 07:34:45.773+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 06:34:45.773+00	2026-03-26 06:34:45.773+00
5880d501-3d5e-4aad-9742-da36576567c1	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTA5MjU3LCJleHAiOjE3NzQ1MTI4NTd9.LUQFiyyK5tigc2uxuGMcE-VhpKDzZhoc4P44MAOHKQ4	2026-03-26 08:14:17.113+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 07:14:17.114+00	2026-03-26 07:14:17.114+00
4ac53be1-ce13-40af-98a5-4a16072ae499	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTA5MzA1LCJleHAiOjE3NzQ1MTI5MDV9.kO_HRIiabslbaZ4qYN-l2vB5Vm3Vh9R9LZi7aT_KXV4	2026-03-26 08:15:05.332+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 07:15:05.332+00	2026-03-26 07:15:05.332+00
\.


--
-- Name: AboutPages_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."AboutPages_id_seq"', 1, true);


--
-- Name: AboutTeamMembers_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."AboutTeamMembers_id_seq"', 1, false);


--
-- Name: AboutValues_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."AboutValues_id_seq"', 1, false);


--
-- Name: Brands_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."Brands_id_seq"', 12, true);


--
-- Name: Categories_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."Categories_id_seq"', 6, true);


--
-- Name: Products_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."Products_id_seq"', 100, true);


--
-- Name: product_images_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.product_images_id_seq', 18, true);


--
-- Name: products_id_producto_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.products_id_producto_seq', 83, true);


--
-- Name: AboutPages AboutPages_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."AboutPages"
    ADD CONSTRAINT "AboutPages_pkey" PRIMARY KEY (id);


--
-- Name: AboutPages AboutPages_slug_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."AboutPages"
    ADD CONSTRAINT "AboutPages_slug_key" UNIQUE (slug);


--
-- Name: AboutTeamMembers AboutTeamMembers_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."AboutTeamMembers"
    ADD CONSTRAINT "AboutTeamMembers_pkey" PRIMARY KEY (id);


--
-- Name: AboutValues AboutValues_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."AboutValues"
    ADD CONSTRAINT "AboutValues_pkey" PRIMARY KEY (id);


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
-- Name: UserCalorieHistory UserCalorieHistory_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."UserCalorieHistory"
    ADD CONSTRAINT "UserCalorieHistory_pkey" PRIMARY KEY (id);


--
-- Name: UserProfiles UserProfiles_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."UserProfiles"
    ADD CONSTRAINT "UserProfiles_pkey" PRIMARY KEY (id);


--
-- Name: UserProfiles UserProfiles_userId_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."UserProfiles"
    ADD CONSTRAINT "UserProfiles_userId_key" UNIQUE ("userId");


--
-- Name: UserWeightHistory UserWeightHistory_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."UserWeightHistory"
    ADD CONSTRAINT "UserWeightHistory_pkey" PRIMARY KEY (id);


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
-- Name: uq_products_name_brand_category; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX uq_products_name_brand_category ON core."Products" USING btree (lower(btrim((name)::text)), "brandId", "categoryId");


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
-- Name: AboutTeamMembers fk_aboutteam_aboutpage; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."AboutTeamMembers"
    ADD CONSTRAINT fk_aboutteam_aboutpage FOREIGN KEY ("aboutPageId") REFERENCES core."AboutPages"(id) ON DELETE CASCADE;


--
-- Name: AboutValues fk_aboutvalues_aboutpage; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."AboutValues"
    ADD CONSTRAINT fk_aboutvalues_aboutpage FOREIGN KEY ("aboutPageId") REFERENCES core."AboutPages"(id) ON DELETE CASCADE;


--
-- Name: UserCalorieHistory fk_usercaloriehistory_user; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."UserCalorieHistory"
    ADD CONSTRAINT fk_usercaloriehistory_user FOREIGN KEY ("userId") REFERENCES core."Users"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserProfiles fk_userprofiles_user; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."UserProfiles"
    ADD CONSTRAINT fk_userprofiles_user FOREIGN KEY ("userId") REFERENCES core."Users"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserWeightHistory fk_userweighthistory_user; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."UserWeightHistory"
    ADD CONSTRAINT fk_userweighthistory_user FOREIGN KEY ("userId") REFERENCES core."Users"(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- PostgreSQL database dump complete
--

\unrestrict 8jw1ObT8ncBqxUo7mo6NCNdVV1NjXjG4teXqcD1Zd88qpSP2B0VeMziELhcMr18

