--
-- PostgreSQL database dump
--

\restrict hvVHBXG4U1ZUpXOjCtxgvJicpuT5UBKzEld57JaRdcGoXof4iPHN8Rj0Y3gLygO

-- Dumped from database version 17.8 (a48d9ca)
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
    "updatedAt" timestamp with time zone NOT NULL,
    "mustChangePassword" boolean DEFAULT false NOT NULL
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
1	main	Nuestra Historia	Acerca de Nosotros	Sobre Nosotros	Somos mas que un gimnasio, somos una comunidad comprometida con tu bienestar fisico y emocional.	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774935162/titanium/about/apeybvradrhklztovaqy.jpg	titanium/about/apeybvradrhklztovaqy	Nuestra Pasion por el Fitness	Motivación	En Titanium Sport Gym, hemos creado un espacio donde cada persona puede alcanzar su maximos potencial.	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774935075/titanium/about/mmlx7yhjmfennyzpdcon.jpg	titanium/about/mmlx7yhjmfennyzpdcon	500+	Miembros Activos	15+	Entrenadores Certificados	12	Horario de Servicio	Mision	Ofrecer un entorno acogedor, inclusivo y seguro donde nuestros socios se inspiren y motiven a lograr sus metas de bienestar físico y emocional.\r\n\r\nNos comprometemos a tener instalaciones a la vanguardia y a un equipo de profesionales enfocados en apoyar a cada socio en su camino hacia una vida saludable.	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774603009/titanium/about/uzj7vkgggf3ejccjrmpi.jpg	titanium/about/uzj7vkgggf3ejccjrmpi	Vision	Ser el gimnasio favorito de la comunidad, reconocidos por nuestro compromiso con el bienestar integral y la excelencia en el servicio.	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774616825/titanium/about/o8kn9cn66fbm3j3jvg61.jpg	titanium/about/o8kn9cn66fbm3j3jvg61	Valores		https://res.cloudinary.com/dqf9pdcte/image/upload/v1774616826/titanium/about/f0q4mb8g4z3n4khqsmin.jpg	titanium/about/f0q4mb8g4z3n4khqsmin	Listo para transformar tu vida?	Unete a nuestra comunidad y comienza tu viaje hacia una vida mas saludable y activa.	Av. Corona del Rosal N 15. Col. 5 de mayo. Huejutla, Hidalgo Mexico.	771 197 6803	Contactanos	/contacto	Ver Servicios	/servicios	t	2026-03-25 07:34:58.451+00	2026-03-31 05:32:45.935+00
\.


--
-- Data for Name: AboutTeamMembers; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."AboutTeamMembers" (id, "aboutPageId", name, role, description, "imageUrl", "imagePublicId", "facebookUrl", "twitterUrl", "linkedinUrl", "order", "isActive", "createdAt", "updatedAt") FROM stdin;
1	1	Carlos Mendoza	Entrenador	Con más de 15 años de experiencia	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774617231/titanium/about/team/u15udz969sjlc59tye2q.jpg	titanium/about/team/u15udz969sjlc59tye2q				0	t	2026-03-27 13:13:50.963+00	2026-03-27 13:13:50.963+00
2	1	Maria Gonzalez	Nutricion y acompanamiento	Seguimiento cercano para sostener habitos, alimentacion y constancia a largo plazo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774617540/titanium/about/team/x76aqpohckumj5ajykrf.jpg	titanium/about/team/x76aqpohckumj5ajykrf				1	t	2026-03-27 13:18:59.702+00	2026-03-27 13:18:59.702+00
3	1	Alex Rodriguez	Entrenamiento funcional	Clases intensas, movilidad y trabajo dinamico para quienes buscan subir nivel con estructura.	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774617607/titanium/about/team/hkrsg729wytyyorv6oer.jpg	titanium/about/team/hkrsg729wytyyorv6oer				2	t	2026-03-27 13:19:00.87+00	2026-03-27 13:20:06.789+00
\.


--
-- Data for Name: AboutValues; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."AboutValues" (id, "aboutPageId", title, description, "iconKey", "order", "isActive", "createdAt", "updatedAt") FROM stdin;
2	1	Integridad y respeto.	Garantiza un ambiente donde se actúa con honestidad y se respeta a cada persona, fomentando la confianza y la convivencia.	users	1	t	2026-03-27 14:19:49.606+00	2026-03-27 14:19:49.606+00
1	1	Pasión por el fitness y la salud	Refleja el compromiso por motivar a los socios a mejorar su bienestar físico y mental mediante el ejercicio constante.	shield	0	t	2026-03-27 13:10:27.857+00	2026-03-27 14:20:18.746+00
3	1	Compromiso con nuestros socios:	Implica brindar atención, seguimiento y apoyo para que cada usuario logre sus objetivos de manera efectiva.	heart	2	t	2026-03-27 14:25:54.245+00	2026-03-27 14:25:54.245+00
4	1	Innovación y excelencia:	Se enfoca en mejorar continuamente las instalaciones, servicios y calidad de atención para ofrecer la mejor experiencia.	check	3	t	2026-03-27 14:27:17.037+00	2026-03-27 14:27:17.037+00
\.


--
-- Data for Name: Brands; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."Brands" (id, id_marca, name, active, "categoryId", "createdAt", "updatedAt") FROM stdin;
1	1	Optimum Nutrition	t	1	2026-03-04 05:13:32.472+00	2026-03-04 05:13:32.472+00
13	13	Nkie	t	3	2026-03-27 16:13:31.093+00	2026-03-27 16:13:31.093+00
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
3	3	Ropa	f	2026-03-05 14:09:45.014+00	2026-03-27 18:03:30.225+00
1	1	Proteinas	t	2026-03-04 05:12:43.589+00	2026-03-04 05:12:53.679+00
2	2	Tennis	t	2026-03-04 05:15:25.573+00	2026-03-04 05:15:25.573+00
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
97	21	Producto IAST 1	12	6	1500.00	50	Inactivo	\N	Ropa	Producto de prueba IAST	[]	\N	\N	\N	M	Negro	Algodon	2026-03-22 06:19:31.104+00	2026-03-27 18:02:18.992+00
91	19	Straps de levantamiento Harbinger	9	4	500.00	5	Activo	\N	Ropa	Correas de levantamiento que ayudan a mejorar el agarre en ejercicios como peso muerto o remo.	[]	\N	\N	\N	Única	Negro	Piel	2026-03-19 18:17:17.416+00	2026-03-19 18:17:17.416+00
100	23	Proteina	1	1	300.00	8	Inactivo	\N	Suplementación	prueba xss	["seguro"]	Vainilla	900 g	28	\N	\N	\N	2026-03-24 06:40:35.833+00	2026-03-27 18:02:25.481+00
98	22	Producto IAST Invalido	12	6	-1500.00	-50	Inactivo	\N	Ropa	Producto de prueba Invalido	[]	\N	\N	\N	M	Negro	Algodon	2026-03-22 06:25:16.69+00	2026-03-25 05:45:40.949+00
13	13	Tennis Adidas Elite Morado	2	2	1500.00	3	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773351955/titanium/products/zt0vkaawatodqdlwh0jr.jpg	Ropa	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 05:21:21.945547+00	2026-03-25 05:45:56.676+00
101	24	Cinturon	8	4	1000.00	2	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774634765/titanium/products/twkexpvy21gwz7q69egj.jpg	Ropa	Cuida tu cuerpo	["Cinturon de cuero"]	\N	\N	\N	Unica	Negro	cuero	2026-03-27 18:06:04.811+00	2026-03-27 18:06:04.811+00
85	15	Cinturón de levantamiento Reebok	8	4	650.00	5	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433425/titanium/products/fvxiecu48lqqsf2z0ogn.jpg	Ropa	Cinturón de gimnasio diseñado para proteger la zona lumbar durante ejercicios de fuerza como peso muerto o sentadilla	["Soporte lumbar reforzado"]	\N	\N	\N	M / G	Negro / Rojo	Cuero sintético	2026-03-12 22:14:08.377+00	2026-03-25 10:10:27.952+00
9	9	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773351971/titanium/products/rhqu3nqb2oxbjjjxjs7d.jpg	Ropa	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 05:21:21.945547+00	2026-04-03 05:19:18.963+00
96	20	Cinturón de pesas Gymreapers	8	4	390.00	12	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433484/titanium/products/bu2qdwjfqhovupyomvfm.jpg	Ropa	Guantes diseñados para mejorar el agarre y reducir ampollas durante el entrenamiento.	["Palma acolchada"]	\N	\N	\N	CH / M / G	Negro / Gris	Poliéster	2026-03-19 18:21:25.094+00	2026-03-25 10:11:26.804+00
90	18	Bandas de resistencia Life Fitnness	9	4	550.00	6	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433344/titanium/products/pyxtlxrveaalp7baoa60.jpg	Ropa	Bandas elásticas ideales para entrenamiento funcional, calentamiento o rehabilitación.	["Diferentes niveles de resistencia"]	\N	\N	\N	Única	Negro	Azul / Negro	2026-03-19 18:12:48.286+00	2026-04-12 04:24:46.197+00
4	4	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773308505/titanium/products/gijycqnyokjl4almgx0f.jpg	Ropa	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 05:21:21.945547+00	2026-03-12 09:41:45.813+00
11	11	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773310154/titanium/products/anb6jws0dpedg7lsjdee.jpg	Ropa	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 05:21:21.945547+00	2026-03-12 10:09:15.026+00
46	14	Sudadera Alo	7	3	1110.00	10	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773337807/titanium/products/yr00hgjzp2bslrcnaid3.jpg	Ropa	Sudadera comoda	["Comodo","Fresco"]	\N	\N	\N	M	Negro	Poliester	2026-03-12 17:50:08.201+00	2026-03-12 17:50:08.201+00
\.


--
-- Data for Name: UserCalorieHistory; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."UserCalorieHistory" (id, "userId", "recordDate", "dailyCalories", "nextAllowedDate", "createdAt", "updatedAt") FROM stdin;
675c9d14-fe19-43aa-9b7c-a93bc663a26a	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-26	2000	2026-04-02	2026-03-26 06:56:11.613+00	2026-03-26 06:56:11.613+00
4265e04f-ea64-4524-8c6a-30e87a063eca	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-27	2300	2026-03-28	2026-03-27 06:05:21.763+00	2026-03-27 06:05:21.763+00
6ed18eaf-7200-4e7b-ab3b-7747cd5b808e	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-19	2180	2026-02-20	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
29cbbe5c-4dd5-496d-a69a-72413f5e6cfc	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-20	2140	2026-02-21	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
3f42226c-415c-466a-9190-256fe344c505	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-21	2210	2026-02-22	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
9f8d53f8-1288-4536-a955-ef3d0baae0fa	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-22	2100	2026-02-23	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
eda05b60-f7bf-4c2f-9973-a40e1e9e7071	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-23	2050	2026-02-24	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
9d5504e7-fe7f-4773-b27a-38463a7ade50	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-24	2120	2026-02-25	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
f69a0698-f795-47d0-8541-71bcc0e86873	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-25	2080	2026-02-26	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
877c99a2-06f4-49ab-a0ad-60ef3dd7a434	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-26	2060	2026-02-27	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
e1509d2a-d140-4939-af80-9283522f2de1	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-27	2020	2026-02-28	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
f896441a-dbdd-407c-8bc5-484ea29a4fe4	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-28	2090	2026-03-01	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
196c902d-1180-4997-8eb5-f9abd497aa16	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-01	2040	2026-03-02	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
16f564c4-68e4-4dbe-b633-aa6b680180f5	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-02	2010	2026-03-03	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
00713b71-2c11-4f34-9b50-c3e7b6cf5e74	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-03	1980	2026-03-04	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
8fe02b3e-1db2-4457-94e3-a52af76fdaec	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-04	2030	2026-03-05	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
389d6166-f16b-4cce-bce3-a6436a9b903f	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-05	1990	2026-03-06	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
b9ec254e-9c50-4f94-a33f-22a871c29693	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-06	1960	2026-03-07	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
49b9f8ff-d41a-4370-ba54-1474d61556bf	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-07	2020	2026-03-08	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
4b8ed4de-5131-4a7b-a5ae-d55168907272	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-08	1940	2026-03-09	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
32ce055f-4688-45e1-b7e6-8fc1fc8e3fe5	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-09	2000	2026-03-10	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
2352793d-6df0-49dc-a495-f96fb9315e7c	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-10	1970	2026-03-11	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
ca78dd25-246e-4f68-8cc5-355b1c55f200	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-11	1930	2026-03-12	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
b12b344b-9515-4483-8478-cdeaa266c42e	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-12	1980	2026-03-13	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
d5789910-917f-4755-808c-16803b7a00e2	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-13	1910	2026-03-14	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
cac64027-ca6d-47f7-ad14-b993beeb1cfa	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-14	1960	2026-03-15	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
7a4312bb-a0c9-42c2-b6b9-aa91838cf909	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-15	1900	2026-03-16	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
5bf22524-d546-4a74-bc85-f9e51feb92f6	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-16	1950	2026-03-17	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
a14f9516-2656-425c-883b-b05ca59e0b93	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-17	1920	2026-03-18	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
dfc526db-77be-4a24-85fe-7d11e061c23c	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-18	1890	2026-03-19	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
f1a4853b-4de7-4cbc-ad03-f6ce0c3242dd	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-19	1940	2026-03-20	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
de868ecd-b627-44a4-b9cc-056691674e1f	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-20	1880	2026-03-21	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
2aa148a4-55bd-42b3-a3f9-78861180222f	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-21	1930	2026-03-22	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
e96d6bfd-7bb4-4191-b1ac-67bc5e33f08b	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-22	1870	2026-03-23	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
8d5ad403-2174-447e-ab9e-f1a1f113420a	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-23	1920	2026-03-24	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
d0f827b9-ade6-410d-babe-caae735c518b	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-24	1860	2026-03-25	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
5d178cfc-a16d-4534-8cad-f84033fea7dc	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-25	1910	2026-03-26	2026-03-27 06:13:02.976178+00	2026-03-27 06:13:02.976178+00
\.


--
-- Data for Name: UserProfiles; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."UserProfiles" (id, "userId", age, gender, height, "initialWeight", "targetWeight", "startDate", "weeklyGymDays", "activityLevel", "fitnessGoal", "createdAt", "updatedAt") FROM stdin;
d6aae7da-dfee-449c-8da3-59fe97e99e5d	9b991004-40dc-499d-ab73-7a5edc57d7dc	25	male	1.75	85.00	75.00	2026-02-18	7	moderate	lose	2026-03-26 06:25:29.768+00	2026-03-26 13:05:55.953+00
\.


--
-- Data for Name: UserWeightHistory; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."UserWeightHistory" (id, "userId", "recordDate", weight, "nextAllowedDate", "createdAt", "updatedAt") FROM stdin;
899cc78b-1a74-42f1-97b5-9eb104f98637	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-19	85.00	2026-02-26	2026-03-26 07:00:38.609242+00	2026-03-26 07:00:38.609242+00
5309e057-2826-473e-a771-6018c95848cd	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-02-26	84.30	2026-03-05	2026-03-26 07:00:38.609242+00	2026-03-26 13:08:31.311+00
920da35a-fb67-4102-939d-5650624724cf	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-05	83.50	2026-03-12	2026-03-26 07:00:38.609242+00	2026-03-26 13:09:02.079+00
bcb17ffe-3017-4134-ad7f-ab1760d52e66	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-12	82.70	2026-03-19	2026-03-26 07:00:38.609242+00	2026-03-26 13:09:22.021+00
b38f69f4-9d94-48ca-8f59-b93a1cdc6816	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-19	81.90	2026-03-26	2026-03-26 07:00:38.609242+00	2026-03-26 13:11:25.872+00
1cc39c12-a05b-4243-a6d5-2226c9266384	9b991004-40dc-499d-ab73-7a5edc57d7dc	2026-03-26	80.80	2026-04-02	2026-03-26 06:56:27.559+00	2026-03-26 13:12:19.326+00
cd81ab31-3101-4161-9e58-285cead84167	441081d1-9900-488c-a5ff-bb263d587e92	2026-04-14	84.00	2026-04-21	2026-04-14 00:02:48.949+00	2026-04-14 00:02:48.949+00
\.


--
-- Data for Name: Users; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."Users" (id, email, password, otp, "otpExpires", "isVerified", "isPendingApproval", "accessToken", "totpSecret", "authMethod", role, provider, "providerId", "passwordChangesCount", "passwordChangesDate", "createdAt", "updatedAt", "mustChangePassword") FROM stdin;
e2b8251c-a695-40d9-aafc-5cd838525c53	admin@titanium.com	$2b$10$m1NFF4wNJ/gTrXzz2Cw3telkpHFBFsfTFeHJplMR07157oSQJcTJy	\N	\N	t	f	\N	\N	normal	administrador	local	\N	0	\N	2026-03-04 05:02:30.840499+00	2026-03-04 05:02:30.840499+00	f
ef71c219-0144-4c1f-903e-16cf0f2d4c88	entrenador@titanium.com	$2b$10$OrM2nfSKlIxQpiJ/VElFsOZxWKUi4dnF3hqUcYLdUDKJFuG8w1ovK	\N	\N	t	f	\N	\N	normal	entrenador	local	\N	0	\N	2026-03-22 18:23:24.35+00	2026-03-22 18:23:24.35+00	f
9b991004-40dc-499d-ab73-7a5edc57d7dc	cliente@titanium.com	$2b$10$vnERiv/c9kwMMq9bagipH.bUR6t3ZJ8UkTUGy6YmKO17ZE/wV7rJC	\N	\N	t	f	\N	\N	normal	cliente	local	\N	0	\N	2026-03-22 18:23:24.613+00	2026-03-22 18:23:24.613+00	f
ec96ac21-803c-420b-b329-b8a77ae379dc	castrorosajm@gmail.com	$2b$10$g49tZJxHUd7bXH9KBAHv7.b53EPkj5gIy9Mc.eCH/wMzGx6r4ixay	\N	\N	t	f	\N	\N	normal	cliente	local	\N	0	\N	2026-03-19 07:56:53.047+00	2026-03-19 07:56:53.047+00	f
6867f584-0c07-4daf-a215-ec8ef1d620e8	20230004@uthh.edu.mx	$2b$10$kcJ1V8a4Ffta9mpV6hePo.ePU1XLiJdUigqiPChgTOzseoYtpFtiq	\N	\N	t	f	\N	\N	normal	entrenador	local	\N	1	2026-04-09	2026-04-09 05:39:08.144+00	2026-04-09 05:44:57.698+00	f
5eb9bb66-894d-4702-9598-24e3f6ae8122	xrogeliohdezverax@gmail.com	$2b$10$b0X.zrmiYCt.jlYHK9y.Cu5jGbyKyIiTncgkpFwow1aPuExGdd6tG	\N	\N	t	f	\N	\N	normal	cliente	local	\N	0	\N	2026-04-09 05:47:15.443+00	2026-04-09 05:50:41.104+00	f
441081d1-9900-488c-a5ff-bb263d587e92	20230008@uthh.edu.mx	$2b$10$QBZlmjMTAdxpX7qMne2BgunKTohgG6lmA6XvlqSYJ2SIS70kOUlCO	\N	\N	t	f	\N	\N	otp	cliente	local	\N	1	2026-04-13	2026-04-09 05:53:38.055+00	2026-04-13 23:59:22.631+00	f
adeaa659-4352-4525-a790-e86a5de0051e	alexisyazirh@gmail.com	$2b$10$9Re7TfPNY26Vr5FMxn/uU.qVKC7jY6hMelvu5j9Ip.gWYzKWcSo2C	\N	\N	t	f	\N	\N	normal	cliente	local	\N	0	\N	2026-04-14 00:46:36.632+00	2026-04-14 00:47:25.43+00	f
1859cd81-2d69-4c95-994a-cdc2eaa0f6c8	entrenador2@titanium.com	$2b$10$BGsIC.6.7jjYXX.yUlrtjuCb8uExz/AwJhafmv4js8Cwk.JN4h9TG	\N	\N	t	f	\N	\N	normal	entrenador	local	\N	0	\N	2026-04-12 02:05:22.586+00	2026-04-12 02:05:22.586+00	t
b5a950ac-2343-44ca-8859-0e3a8705a130	castrorosasjuanmanuel7@gmail.com	$2b$10$aj.rBKsNxI5TgO8Afj6VeOrf1BiY4voS.FWPWrpkyXvdlr/GOnXIm	\N	\N	t	f	\N	\N	normal	cliente	local	\N	0	\N	2026-04-12 05:36:45.685+00	2026-04-12 05:37:20.946+00	f
214b2a05-3583-4d04-bd56-400007abbb07	entrenador3@titanium.com	$2b$10$j63Bir3HWnJE1vM12f.KqOC.BRog0sftlmFy/DjEBPBxgyVOwQJO2	\N	\N	t	f	\N	\N	normal	entrenador	local	\N	1	2026-04-12	2026-04-12 05:44:00.884+00	2026-04-12 05:44:29.979+00	f
62c88847-e53b-4e54-8b98-5e6be7387a72	20230060@uthh.edu.mx	\N	\N	\N	t	f	\N	\N	normal	cliente	google	114847621552512941352	0	\N	2026-04-13 23:49:32.792+00	2026-04-13 23:49:32.792+00	f
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
14	18	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433344/titanium/products/pyxtlxrveaalp7baoa60.jpg	0	titanium/products/pyxtlxrveaalp7baoa60	2026-03-25 10:09:05.105+00	2026-03-25 10:09:05.105+00	t
15	15	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433425/titanium/products/fvxiecu48lqqsf2z0ogn.jpg	0	titanium/products/fvxiecu48lqqsf2z0ogn	2026-03-25 10:10:26.102+00	2026-03-25 10:10:26.102+00	t
16	15	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433426/titanium/products/ie3jcagadiueqzhcfc04.jpg	1	titanium/products/ie3jcagadiueqzhcfc04	2026-03-25 10:10:27.849+00	2026-03-25 10:10:27.849+00	t
17	20	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433484/titanium/products/bu2qdwjfqhovupyomvfm.jpg	0	titanium/products/bu2qdwjfqhovupyomvfm	2026-03-25 10:11:24.651+00	2026-03-25 10:11:24.651+00	t
18	20	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774433485/titanium/products/mu55blqhu6ktiggsl9xv.jpg	1	titanium/products/mu55blqhu6ktiggsl9xv	2026-03-25 10:11:26.705+00	2026-03-25 10:11:26.705+00	t
19	24	https://res.cloudinary.com/dqf9pdcte/image/upload/v1774634765/titanium/products/twkexpvy21gwz7q69egj.jpg	0	titanium/products/twkexpvy21gwz7q69egj	2026-03-27 18:06:04.994+00	2026-03-27 18:06:04.994+00	t
20	9	https://res.cloudinary.com/dqf9pdcte/image/upload/v1775193558/titanium/products/tecwocsbftfkhz3jylkr.jpg	0	titanium/products/tecwocsbftfkhz3jylkr	2026-04-03 05:19:18.861+00	2026-04-03 05:23:13.116+00	t
13	9	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773351971/titanium/products/rhqu3nqb2oxbjjjxjs7d.jpg	1	titanium/products/rhqu3nqb2oxbjjjxjs7d	2026-03-12 21:46:11.74+00	2026-04-03 05:23:13.214+00	t
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
af5dcdef-6d9e-4db1-962f-7ffc64f8c4e7	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTA5ODU2LCJleHAiOjE3NzQ1MTM0NTZ9.Gt2rB2zG-UErZ-X3tS3iW_r-XW2T8tSnY6Sa7v1IIGo	2026-03-26 08:24:16.527+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 07:24:16.528+00	2026-03-26 07:24:16.528+00
0dccd9ea-ba6f-4735-b356-0adb54f11055	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTExMDcwLCJleHAiOjE3NzQ1MTQ2NzB9.vQp98RufSGU-dp4W4C2eCFaLH5tpNrWarg1ZiC5mH_E	2026-03-26 08:44:30.267+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 07:44:30.269+00	2026-03-26 07:44:30.269+00
e138a8e7-5115-4aad-8490-bbfc4c459335	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MTEzOTMsImV4cCI6MTc3NDUxNDk5M30.MI-am0wQ6yR4X46bWnUrWd8mm-F_si8kgMqFjlEUsy8	2026-03-26 08:49:53.231+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 07:49:53.236+00	2026-03-26 07:49:53.236+00
d0e6565a-bb24-4f44-a3cd-4a24c22c811c	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MTE0MDYsImV4cCI6MTc3NDUxNTAwNn0.fy5yaa3uCfnOCp22YM8CYc-LdTByQeKZH4XL7N6MB1g	2026-03-26 08:50:06.093+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 07:50:06.095+00	2026-03-26 07:50:06.095+00
eaad57d7-8a0d-46d3-8a81-a5fb757de879	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MTMzOTAsImV4cCI6MTc3NDUxNjk5MH0.KFwAohhp8keqxMhmQYHvooWiFOPlHU_E_5JEBZsM2Uc	2026-03-26 09:23:10.377+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 08:23:10.379+00	2026-03-26 08:23:10.379+00
4c72a5be-c155-4104-9d8f-8b6c06db1662	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MTQyOTYsImV4cCI6MTc3NDUxNzg5Nn0.xLqOfsA5TQE9U73NURr1beYWCn7HR2yD10qSsTGIPNo	2026-03-26 09:38:16.911+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 08:38:16.911+00	2026-03-26 08:38:16.911+00
884b6278-e5bf-4e2a-9374-fc6b679f5613	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MTY2MzAsImV4cCI6MTc3NDUyMDIzMH0.FaFKy1WZQCCkSzBSQBZr9ADWS4hXTGn6Jj2Ys4KFFe0	2026-03-26 10:17:10.363+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 09:17:10.368+00	2026-03-26 09:17:10.368+00
b9dabb8d-2123-48e8-9206-148e4c5ff31f	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MTk5OTcsImV4cCI6MTc3NDUyMzU5N30.02p7ZnGKOFPckZrH_H6MgqjjhAzrJ_SWAzY3xEI-8Xw	2026-03-26 11:13:17.459+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 10:13:17.462+00	2026-03-26 10:13:17.462+00
25e40a86-a233-4ef5-89c9-2bd7a4898efa	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MjIzNzUsImV4cCI6MTc3NDUyNTk3NX0.P5HgtVcWcRy8oVlR3yTF5gBCF9uomgvzH-nqNCc7HBs	2026-03-26 11:52:55.274+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 10:52:55.274+00	2026-03-26 10:52:55.274+00
35fa37f0-3316-45fd-b2b8-4a1762f7a733	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTI0MzQ4LCJleHAiOjE3NzQ1Mjc5NDh9.f2XwzTyLUZ4knnWbHZk_mO2FRSii9ZYauTp3onP7S4k	2026-03-26 12:25:48.455+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 11:25:48.455+00	2026-03-26 11:25:48.455+00
83d22c16-1b67-4bcf-918c-b5a40f088151	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTI1OTkzLCJleHAiOjE3NzQ1Mjk1OTN9.pUKml-HyhzGsvrZdzkAkDGNEcynAbMw1MCYUrWUdUDU	2026-03-26 12:53:13.249+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 11:53:13.25+00	2026-03-26 11:53:13.25+00
02e3a50c-9e8a-480b-8b7d-f92cc41322ce	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MjU5OTgsImV4cCI6MTc3NDUyOTU5OH0.uQuMZtpcyaQNr6iG4DygmqToztGF3UxyptJLZSPRABU	2026-03-26 12:53:18.608+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 11:53:18.609+00	2026-03-26 11:53:18.609+00
dff65a85-6656-4605-88a1-ce0ab756e538	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1Mjk3NzIsImV4cCI6MTc3NDUzMzM3Mn0.UiDbJ0SlD_PlAf8rcsVWZNk3DUISH-MpvoMlDMqLlKo	2026-03-26 13:56:12.547+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 12:56:12.549+00	2026-03-26 12:56:12.549+00
88e54417-ab37-417e-b3b5-42d9bd881612	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTMyMTA3LCJleHAiOjE3NzQ1MzU3MDd9.UFJufGYTzPZIrH509XtBNDUlmrJM1IYdyUuyMGnH7eA	2026-03-26 14:35:07.42+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 13:35:07.421+00	2026-03-26 13:35:07.421+00
8e8fd580-ec91-44e0-b2bd-b91aa0591f38	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MzIxNDEsImV4cCI6MTc3NDUzNTc0MX0.ynxC17kA6dJGVNT785VBQkzHlhDbzqIoqAAMCSyfr8Y	2026-03-26 14:35:41.331+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 13:35:41.331+00	2026-03-26 13:35:41.331+00
ef7ba2ea-92f0-44db-83bb-9ac9c4a4d0f5	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MzY0MjAsImV4cCI6MTc3NDU0MDAyMH0.XV01Kf2vwVLiugdsSYBQobDyixAckhRITPCtw4ZPBYs	2026-03-26 15:47:00.475+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 14:47:00.476+00	2026-03-26 14:47:00.476+00
d9d84030-1733-48d5-ae4a-75904cff09d2	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1MzY0OTEsImV4cCI6MTc3NDU0MDA5MX0.xz6SYCyVFL-xZJYan9i3qR9oZsagbclzAilNMFwAI1Y	2026-03-26 15:48:11.041+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 14:48:11.041+00	2026-03-26 14:48:11.041+00
30dffde5-5f60-45ba-8c62-5f263a6604c1	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1NDA5MzAsImV4cCI6MTc3NDU0NDUzMH0.m-yhznAYK4C15cro42r9hkguUtHD2HKO2LUB-_2ECig	2026-03-26 17:02:10.549+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 16:02:10.55+00	2026-03-26 16:02:10.55+00
dd7ac5b4-5530-418f-b228-450498dbaa4d	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1NDMxMDUsImV4cCI6MTc3NDU0NjcwNX0.bVEN3_s3MQBGMAKtJEMvkMKGyp5vTTcjMF8GNHk5f3g	2026-03-26 17:38:25.832+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 16:38:25.833+00	2026-03-26 16:38:25.833+00
aa18837b-8990-4e00-b5c1-24d5ccd61cac	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1NDc0NTUsImV4cCI6MTc3NDU1MTA1NX0.sMBm_6I41ECWLv04B37R4IvLDraNyrtUX-fM6yfjs0o	2026-03-26 18:50:55.634+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 17:50:55.635+00	2026-03-26 17:50:55.635+00
d449e02e-a569-4b8e-86dc-a882f324296e	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1NTM0MTYsImV4cCI6MTc3NDU1NzAxNn0.LcunfD86vFH8bQ9PxEy76KtUP4WJKQI7In3ecfuyMd8	2026-03-26 20:30:16.405+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 19:30:16.407+00	2026-03-26 19:30:16.407+00
048604da-1168-4107-80fd-45f5c12bc246	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTU0NTUwLCJleHAiOjE3NzQ1NTgxNTB9.9_zWS9-cizj9AK7VCD84E3DN613FUQTnWdxsNgYb4k8	2026-03-26 20:49:10.432+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 19:49:10.432+00	2026-03-26 19:49:10.432+00
7a44391c-e973-440e-9b98-3cf22bd2ff06	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1NTUzNTMsImV4cCI6MTc3NDU1ODk1M30.25fBEWxhAIGo-jXCnI40eBpABcTicGJy_F-MSfDjYyE	2026-03-26 21:02:33.371+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-26 20:02:33.381+00	2026-03-26 20:02:33.381+00
37385984-55bd-4133-85ee-a3983da34716	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTcxNzMzLCJleHAiOjE3NzQ1NzUzMzN9.tkkemkU96Qp1-PHNIXywyi8nrM1FMCOssnozuaHJQb4	2026-03-27 01:35:33.58+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 00:35:33.582+00	2026-03-27 00:35:33.582+00
13f4979a-d1e8-4310-a464-9626b39010ef	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTcyODM0LCJleHAiOjE3NzQ1NzY0MzR9.8gMA3wiuGcEbwt3HQQKf_GSa-N0BXAeu8XLF9k1Siig	2026-03-27 01:53:54.538+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 00:53:54.538+00	2026-03-27 00:53:54.538+00
ca700a52-cf32-4e9e-a7ba-8064b6bfb35a	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTcyODY1LCJleHAiOjE3NzQ1NzY0NjV9.K25-7VEcmBj5xb1T6SCmvjGJggFE7txl2-kwSLbzOdM	2026-03-27 01:54:25.472+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 00:54:25.472+00	2026-03-27 00:54:25.472+00
7e011fec-5786-466a-8cb8-fa4a94d76ff8	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTg2NjQ3LCJleHAiOjE3NzQ1OTAyNDd9.FHID1iH5r4kQkV7v37a_zC1CzSeDQSEJYGlIfEb9-dE	2026-03-27 05:44:07.127+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 04:44:07.128+00	2026-03-27 04:44:07.128+00
5e4bd573-381b-4d7b-a3b6-a27997772136	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1ODcwMzIsImV4cCI6MTc3NDU5MDYzMn0.3JLfhrZQBuvxzWatfOsTNNHiH9kLIQgh7R7KBXyi-iQ	2026-03-27 05:50:32.724+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 04:50:32.725+00	2026-03-27 04:50:32.725+00
7a04643e-2d9f-439f-8e47-a7aeaf9e9a90	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTg4Mjk5LCJleHAiOjE3NzQ1OTE4OTl9.sIvq89W_dIUC8P92Jz7aZi-hFXWR1G-DRjiMAHPQLBQ	2026-03-27 06:11:39.403+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 05:11:39.403+00	2026-03-27 05:11:39.403+00
88fb4be5-1cd4-4b88-a825-a0c3bc893289	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTg4ODA5LCJleHAiOjE3NzQ1OTI0MDl9.tg8pIBlRPFjiNrRsJgy7gvfcSBlpxi_aBvhxsjw96jg	2026-03-27 06:20:09.109+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 05:20:09.109+00	2026-03-27 05:20:09.109+00
f00cfe0a-9fe9-479a-ad9e-534ced7c88b8	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1ODg5OTEsImV4cCI6MTc3NDU5MjU5MX0.UVMA7i-uGiRlx_sWYoLG651idGW_gLd__1dwYLSwato	2026-03-27 06:23:11.99+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 05:23:11.991+00	2026-03-27 05:23:11.991+00
68f5a16b-d502-4aeb-95b2-7250e167ce58	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NTg5ODcxLCJleHAiOjE3NzQ1OTM0NzF9.ulyy_o75kWmjl-Af0NPqvUB87Qiwffjoms-l3OWZHaI	2026-03-27 06:37:51.824+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 05:37:51.824+00	2026-03-27 05:37:51.824+00
b589b30d-ccea-4546-b687-d606770238af	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1ODk4OTksImV4cCI6MTc3NDU5MzQ5OX0.pESuQz3L5QDxTCPA7FwLCSBQ16tpiybgRMWZpGH6qj4	2026-03-27 06:38:19.032+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 05:38:19.032+00	2026-03-27 05:38:19.032+00
6754cacf-139f-4034-815c-f269022a28f7	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1OTIxMTIsImV4cCI6MTc3NDU5NTcxMn0.T8kPD_H8c25A55600xyHH1rkK2dWWbsKvuLYDzHVbSE	2026-03-27 07:15:12.133+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 06:15:12.133+00	2026-03-27 06:15:12.133+00
9d08f595-1f56-4650-8e74-d074e8c1a9f1	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1OTM0OTYsImV4cCI6MTc3NDU5NzA5Nn0.L8JorPqj0YB6AjMJFqDVKTSWrrrJ6jJ0UhrKL6A2BuA	2026-03-27 07:38:16.961+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 06:38:16.961+00	2026-03-27 06:38:16.961+00
9bb0d361-68fd-4ccf-bc7e-51dd4199d76e	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1OTQ3NzYsImV4cCI6MTc3NDU5ODM3Nn0.1bD9HPuX32GBImbTF4bL88JUFMYxNBPEmPFdntBA39Y	2026-03-27 07:59:36.161+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 06:59:36.161+00	2026-03-27 06:59:36.161+00
a5011446-2698-4f70-8342-ddb10803f734	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1OTYxNzYsImV4cCI6MTc3NDU5OTc3Nn0.CLBSn0hiNAzOK9IKFtdrcs-IkplkCWhYAr6bz9gmewE	2026-03-27 08:22:56.409+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 07:22:56.409+00	2026-03-27 07:22:56.409+00
a4bc68e3-103b-4da1-a57d-4175626e4f3b	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ1OTgxOTUsImV4cCI6MTc3NDYwMTc5NX0.h0mj5CYxKk951mWegPfOGrh0MQNFJiZFo6tcJj3ewq8	2026-03-27 08:56:35.329+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 07:56:35.329+00	2026-03-27 07:56:35.329+00
69763cdf-843c-43c4-94b6-56db20bfff9b	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjAwNDgwLCJleHAiOjE3NzQ2MDQwODB9.1H7diVq4Yn7-4KbhBDM6B1P6BMherluh9p7aFveKBm0	2026-03-27 09:34:40.603+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 08:34:40.604+00	2026-03-27 08:34:40.604+00
818c63aa-1f60-434c-b2aa-4b790e648472	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjAyMjQxLCJleHAiOjE3NzQ2MDU4NDF9.EtS8FMbC_opQ-KMZ4pIF9Qtt6x-f_iMjsBloLfKZ_O4	2026-03-27 10:04:01.119+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 09:04:01.124+00	2026-03-27 09:04:01.124+00
37fef3ee-f59d-45fd-8f2d-bb4d7add9d7c	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjAyODUwLCJleHAiOjE3NzQ2MDY0NTB9.ywJdyRaid6U4jLRdml0E_TlKFPJYBBWWqaOQmzUoigU	2026-03-27 10:14:10.369+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 09:14:10.369+00	2026-03-27 09:14:10.369+00
ca2498ed-c994-4a06-8694-7d7c7c5bbcef	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjAzNDc5LCJleHAiOjE3NzQ2MDcwNzl9.RJLm76ZQ6txqemZMmA-WLEYNeTa0NVnT4iWBuSSubPI	2026-03-27 10:24:39.204+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 09:24:39.205+00	2026-03-27 09:24:39.205+00
6d88f1ba-07b7-4c79-8443-195994289187	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjAzNjIxLCJleHAiOjE3NzQ2MDcyMjF9.DQVrtbaKPbpyrlxg71QkH4oDCQJrD8xI4MZgZETuiuY	2026-03-27 10:27:01.694+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 09:27:01.695+00	2026-03-27 09:27:01.695+00
d1f8e4d2-d86b-4502-bbae-2e7aa73b4527	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjE1OTIyLCJleHAiOjE3NzQ2MTk1MjJ9.ClPJZoLn-fGp0RJbNfkvfDlop0UY31pJrHp-hptSK6k	2026-03-27 13:52:02.809+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 12:52:02.809+00	2026-03-27 12:52:02.809+00
371f246e-c18d-4817-aa35-f654fd1923ce	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjIwOTYzLCJleHAiOjE3NzQ2MjQ1NjN9.NJyeQqmAPo2YpIbAwBGp7TeCFBazgD0_WE6N7kEhhAA	2026-03-27 15:16:03.153+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 14:16:03.154+00	2026-03-27 14:16:03.154+00
76fc6fb0-0ed3-44ef-b5c6-fed5093becda	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ2MjI0NTAsImV4cCI6MTc3NDYyNjA1MH0.wm0_EHnmcLRErzC7MeKIql2g8VI1XKUrSW5wvlbIlpc	2026-03-27 15:40:50.7+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 14:40:50.7+00	2026-03-27 14:40:50.7+00
de36964a-663f-448c-8eca-c998976f3816	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjIyNDgzLCJleHAiOjE3NzQ2MjYwODN9.MP7yr0cLn2U7vkRsWOWubN2vDklp-yEexuUUKZNNnOE	2026-03-27 15:41:23.705+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 14:41:23.705+00	2026-03-27 14:41:23.705+00
19d27bbc-ffe5-4082-beee-bddfb2550df5	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjI3OTYwLCJleHAiOjE3NzQ2MzE1NjB9.N4JzZNg14L8ECMQZ4tH-WVbZ4z2vCZ312IcqDm9rRCU	2026-03-27 17:12:40.754+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 16:12:40.755+00	2026-03-27 16:12:40.755+00
2fb88444-6e95-476f-bf85-755d3d798fcf	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ2Mjk2MjUsImV4cCI6MTc3NDYzMzIyNX0.3hSV7gcRRB53VM0Y6k28PLsPZrvjOx1NPb6tXO5eOX8	2026-03-27 17:40:25.508+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 16:40:25.508+00	2026-03-27 16:40:25.508+00
709bd7d6-3ec4-44c3-a7cd-a018b8ed3f0d	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjMxMzQwLCJleHAiOjE3NzQ2MzQ5NDB9.jW--uZ_vBcE4UAydPh9ALR_gOlxVfUIkhI1t5EEaGYU	2026-03-27 18:09:00.579+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 17:09:00.579+00	2026-03-27 17:09:00.579+00
62e9c852-2645-4bad-bc81-4c220b32e3ee	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjM0NTE4LCJleHAiOjE3NzQ2MzgxMTh9.J95nvQz_BaefzQKEjV23dp7quL6-duG72xJI56NrE3k	2026-03-27 19:01:58.182+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 18:01:58.185+00	2026-03-27 18:01:58.185+00
022cfd0f-1a40-4d16-b79b-62d55e16d6a5	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjM1MzQ3LCJleHAiOjE3NzQ2Mzg5NDd9.wHut77ip-sUXjF5DiwdQ5PNs9xrYrcKyxvAT_Tk9jc0	2026-03-27 19:15:47.007+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 18:15:47.01+00	2026-03-27 18:15:47.01+00
c2df26fe-4566-4036-8d1f-02c4d2d5bc54	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjM1ODA1LCJleHAiOjE3NzQ2Mzk0MDV9.wSwYmvzsHwascOX_mNX7PMJ453RG7lAk_LN2EoxhSCI	2026-03-27 19:23:25.092+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 18:23:25.093+00	2026-03-27 18:23:25.093+00
2bae9028-bc9d-4633-bac8-dde643f258df	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ2MzYxMjgsImV4cCI6MTc3NDYzOTcyOH0.8MbkhBsMsJAiBeqsW9E2LReHZPZ0IZ0uot3N_sf0tjU	2026-03-27 19:28:48.49+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 18:28:48.491+00	2026-03-27 18:28:48.491+00
ae2937dd-e211-4417-92e9-256675644f74	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjM2MzEyLCJleHAiOjE3NzQ2Mzk5MTJ9.bBkVgmaLj_brsNuQhpjmci6ESU_h2vCW420clFiomq8	2026-03-27 19:31:53+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 18:31:53+00	2026-03-27 18:31:53+00
e2024445-1469-4bc5-af30-4c3fe7740d83	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjM2NjUxLCJleHAiOjE3NzQ2NDAyNTF9.cD3KT5DrSjRqVChv8dQrCAqcK-bpcA7HBG6GBclNiWk	2026-03-27 19:37:31.705+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 18:37:31.705+00	2026-03-27 18:37:31.705+00
36ab9403-3ffb-4c62-8c95-e700ca91d857	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ2MzY2NzMsImV4cCI6MTc3NDY0MDI3M30.PluTxaMNmwAhz5YQo_7BhLcvn2qfWeGdKELzju1n0-Q	2026-03-27 19:37:53.509+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 18:37:53.509+00	2026-03-27 18:37:53.509+00
b4f6ca31-50b6-4a4c-8c4f-77f17c0b0027	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ2MzcwMzMsImV4cCI6MTc3NDY0MDYzM30.S1WKbgaZGBOTcVJntOfYwDfQgs9XJSe68xV7UeSq75Y	2026-03-27 19:43:53.376+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 18:43:53.379+00	2026-03-27 18:43:53.379+00
0cd44bcb-ca01-4228-9503-a51a203ce491	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjQ2MzQzLCJleHAiOjE3NzQ2NDk5NDN9.DliOjzcvnCd5rzMqoAm4uqEQ4ujZiIo6RmLFx_jODZw	2026-03-27 22:19:03.407+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 21:19:03.41+00	2026-03-27 21:19:03.41+00
f7e6ac46-caf6-440e-a7f2-76d6aadbd8cf	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ2NDY3NjEsImV4cCI6MTc3NDY1MDM2MX0.y3uXqzRNnQSlZfwP9foqt6t6pgvQPl2WI7xmKODNQb4	2026-03-27 22:26:01.089+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 21:26:01.09+00	2026-03-27 21:26:01.09+00
8c57d6ac-cee1-4861-9b8d-f4d2167848c9	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjQ4NTMwLCJleHAiOjE3NzQ2NTIxMzB9.LYtivTLvNI7aBqp-rIXnludo9uxaP1OdV1tRU2vR9IY	2026-03-27 22:55:30.893+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 21:55:30.893+00	2026-03-27 21:55:30.893+00
2fef720c-5d75-4a7d-9b7d-c50576b29e51	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NjQ5NTE5LCJleHAiOjE3NzQ2NTMxMTl9.8HNcJBkefDCeuxx5o_wEfOG-FgdqG0OivTCCGJoGvIM	2026-03-27 23:11:59.294+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-27 22:11:59.294+00	2026-03-27 22:11:59.294+00
dd558586-0932-480b-a57c-084579865e7f	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NzUyMjAyLCJleHAiOjE3NzQ3NTU4MDJ9.h-bdRWtd9gfdq4ytE0B62oI1AxOVlVmqDhHyhflYAFo	2026-03-29 03:43:22.751+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-29 02:43:22.753+00	2026-03-29 02:43:22.753+00
622cf39d-0508-4532-bd08-4a76cdaf589b	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ3NTIyMTgsImV4cCI6MTc3NDc1NTgxOH0.rUZlcYuJU-ghzPL4ocE8tFzTy1cMqFINVndJL7W1jQI	2026-03-29 03:43:38.052+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-29 02:43:38.053+00	2026-03-29 02:43:38.053+00
5d94e45d-72cc-4038-96b7-9b113e0f3d6f	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NzUyMzAwLCJleHAiOjE3NzQ3NTU5MDB9.fUa9tVEEQMutbx4cehYG2ZmOEAqXH2gZNyEGrXmIoFU	2026-03-29 03:45:00.112+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-29 02:45:00.113+00	2026-03-29 02:45:00.113+00
9b94da93-726b-4d64-9fef-d86e4114a245	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NzUzMTc2LCJleHAiOjE3NzQ3NTY3NzZ9.GbAbhLf_-_ulwHpRpyFf3-5HcX0Vy7Mleg1-p2mG6tk	2026-03-29 03:59:36.938+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-29 02:59:36.939+00	2026-03-29 02:59:36.939+00
3c557655-d6f9-43fc-9fbb-bfa9516c492a	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NzUzMTg3LCJleHAiOjE3NzQ3NTY3ODd9.LwLtThIwXfhgChjzGuAM1kYRMO-ti8rNWP1wp_VjX0k	2026-03-29 03:59:47.375+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-29 02:59:47.375+00	2026-03-29 02:59:47.375+00
242d9f8b-a97b-4bb6-a113-dbd1726c1cf5	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ3NTMyMTgsImV4cCI6MTc3NDc1NjgxOH0.QwA-RiErx6LTECkIV3CKvbj59Yl7ZxHCHgnp2rh6TSw	2026-03-29 04:00:18.192+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-29 03:00:18.192+00	2026-03-29 03:00:18.192+00
b2fbc50a-d105-4e0a-b4a8-c6db97552276	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ3NTMyNzgsImV4cCI6MTc3NDc1Njg3OH0.Kj0wrm7wQntSt4u1UcvtTR64i16-4H3Z5eI7PRuXYGg	2026-03-29 04:01:18.102+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-29 03:01:18.102+00	2026-03-29 03:01:18.102+00
54f15d42-9490-4c13-8577-cc4f42f29544	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NzUzMzY1LCJleHAiOjE3NzQ3NTY5NjV9.WW2TcOPGDYn1J9IbtIFEGBdOJIUVbXIx_ujI4Ih0SOo	2026-03-29 04:02:45.651+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-29 03:02:45.651+00	2026-03-29 03:02:45.651+00
fd327325-f76c-4d01-af30-5589451cf539	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NzU0MTgwLCJleHAiOjE3NzQ3NTc3ODB9.RHng3YPdd0OiZokv_r72NjICMUe5sizbX-dwja_pVqU	2026-03-29 04:16:20.03+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-29 03:16:20.03+00	2026-03-29 03:16:20.03+00
e0dba40e-7281-4fe6-9fdd-7ecb8bebaa47	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0NzU0NTE0LCJleHAiOjE3NzQ3NTgxMTR9.bS2ejgDMyVlyj3SlFizbFtoffXKUwWBF60H9RKjPK6s	2026-03-29 04:21:54.408+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-29 03:21:54.408+00	2026-03-29 03:21:54.408+00
51b8bb08-5ec5-47a3-9c96-679f3118c021	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ3NTQ5ODUsImV4cCI6MTc3NDc1ODU4NX0.VmxrLzSHE0jso3pe7dPp45nts8y0yg8N-mJgJ4m0Idw	2026-03-29 04:29:45.545+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-29 03:29:45.546+00	2026-03-29 03:29:45.546+00
74f40f23-abc1-4d76-ab82-bf89e55c09f4	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ3NTU3NzQsImV4cCI6MTc3NDc1OTM3NH0.TTUETRHtnc9jwc4NMs54BvzGO9L9mCg5cKZah0b-5OQ	2026-03-29 04:42:54.227+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-29 03:42:54.228+00	2026-03-29 03:42:54.228+00
4cbeb2c8-64c7-4c55-a454-af435b4056d1	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzQ5MzQ2MzgsImV4cCI6MTc3NDkzODIzOH0.bSn4KV_c6B2ophjd6e8szCrjirV8dyBS5tP9Q0Nohc0	2026-03-31 06:23:58.074+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-31 05:23:58.077+00	2026-03-31 05:23:58.077+00
346b1ab9-4883-4346-8e81-0b783ec39753	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc0OTM0NjgxLCJleHAiOjE3NzQ5MzgyODF9.bzMokS5LMs-6qFT5UvXwsn2mYdUAf8jxm1njWqgOuhI	2026-03-31 06:24:41.857+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-03-31 05:24:41.857+00	2026-03-31 05:24:41.857+00
6b5faaa2-648b-4a85-84ad-3b82cfef4edf	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1MTkzNDk1LCJleHAiOjE3NzUxOTcwOTV9.fJVVFsOjB4l4CIrqfT6hUCSWNo4m8bLza-k1VInTBMk	2026-04-03 06:18:15.836+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-03 05:18:15.837+00	2026-04-03 05:18:15.837+00
0d14e0dc-98df-4cb9-9d0d-1fbc6e78f4e2	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzUxOTM4MDcsImV4cCI6MTc3NTE5NzQwN30.jJmV4wb6gvuFyD1fdQoQITs1UPluDaXIS0NcSO-Kfss	2026-04-03 06:23:27.714+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-03 05:23:27.714+00	2026-04-03 05:23:27.714+00
23fc01c8-605a-4a12-ae92-93b5157639b3	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU3MDk3MjQsImV4cCI6MTc3NTcxMzMyNH0.iJOPDixTWkcP1BQb_mhOkts_k5SGBaQWKS38O-ddGOk	2026-04-09 05:42:04.215+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-09 04:42:04.218+00	2026-04-09 04:42:04.218+00
c3990302-5914-4ebc-86b1-d149cca469a1	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1NzA5NzUwLCJleHAiOjE3NzU3MTMzNTB9.q61StkgJjkIH9zQ59ZGhhXbNWxvPY1CBP4ey8MUi-AY	2026-04-09 05:42:30.389+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-09 04:42:30.39+00	2026-04-09 04:42:30.39+00
182d71d7-d841-4212-9dbc-8c90e5d40d82	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1NzEwOTUxLCJleHAiOjE3NzU3MTQ1NTF9.LlUOFjtmt24IByAwIxcK2Tw4XBy7W-1GtL_Q2uHioRI	2026-04-09 06:02:31.89+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-09 05:02:31.892+00	2026-04-09 05:02:31.892+00
dfd0c72f-fe59-4d1d-9784-15a8ba97175e	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1NzEyNzAzLCJleHAiOjE3NzU3MTYzMDN9.T8Jlv-NFMc5s9-Z2KdrPH3e7H5bM3LLR5MdMYkTerkc	2026-04-09 06:31:43.89+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-09 05:31:43.975+00	2026-04-09 05:31:43.975+00
8a4782e1-ba55-42c3-979d-f37a9b6db613	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1NzEyOTAyLCJleHAiOjE3NzU3MTY1MDJ9.X7v1Drc88k_CjYo3AoWY0zXxwZ2sD4997kJNDQKy-2g	2026-04-09 06:35:02.229+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-09 05:35:02.243+00	2026-04-09 05:35:02.243+00
3defece0-3573-4553-a871-9a30c4df8860	6867f584-0c07-4daf-a215-ec8ef1d620e8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NjdmNTg0LTBjMDctNGRhZi1hMjE1LWVjOGVmMWQ2MjBlOCIsInJvbGUiOiJlbnRyZW5hZG9yIiwiZW1haWwiOiIyMDIzMDAwNEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU3MTM0MzMsImV4cCI6MTc3NTcxNzAzM30.3ti1M7_594xWIXFgmiLr7evIAWoGedKqu47YuvdM2EM	2026-04-09 06:43:53.494+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-09 05:43:53.494+00	2026-04-09 05:43:53.494+00
dbb1d982-3d4d-481d-a151-513b0802b6ef	6867f584-0c07-4daf-a215-ec8ef1d620e8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NjdmNTg0LTBjMDctNGRhZi1hMjE1LWVjOGVmMWQ2MjBlOCIsInJvbGUiOiJlbnRyZW5hZG9yIiwiZW1haWwiOiIyMDIzMDAwNEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU3MTM2MDAsImV4cCI6MTc3NTcxNzIwMH0.wWPhLB3wQZ2raSuLzmv4Dq0iudU4I98x6g5SK2X-EmU	2026-04-09 06:46:40.291+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-09 05:46:40.291+00	2026-04-09 05:46:40.291+00
a97b9f06-43db-4251-931b-0164d380bbaa	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1NzEzNzE4LCJleHAiOjE3NzU3MTczMTh9.RAiXqQbyWnXmTzoW6Yf2hHlEWJ02rWz20Tot_2z3Y6M	2026-04-09 06:48:38.744+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-09 05:48:38.745+00	2026-04-09 05:48:38.745+00
f53f63a9-c88b-48ad-8e19-10a2baaa2484	441081d1-9900-488c-a5ff-bb263d587e92	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ0MTA4MWQxLTk5MDAtNDg4Yy1hNWZmLWJiMjYzZDU4N2U5MiIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiIyMDIzMDAwOEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU3MTQwODEsImV4cCI6MTc3NTcxNzY4MX0.P7ovMS6NMDrlKZTF1atlmFfiYQk16dz-epriWZyrbIE	2026-04-09 06:54:41.954+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-09 05:54:41.955+00	2026-04-09 05:54:41.955+00
165b46f1-e305-4fd5-9b2c-ad2fd08cbd4e	441081d1-9900-488c-a5ff-bb263d587e92	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ0MTA4MWQxLTk5MDAtNDg4Yy1hNWZmLWJiMjYzZDU4N2U5MiIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiIyMDIzMDAwOEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU3MTQyNTYsImV4cCI6MTc3NTcxNzg1Nn0.kwuZUu600-wSmxqzNhqzK6bcBRBfo0dd6g3DwbZy7wQ	2026-04-09 06:57:36.891+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-09 05:57:36.891+00	2026-04-09 05:57:36.891+00
48a67bc0-5d8c-490e-bc40-17c4873e1cd0	441081d1-9900-488c-a5ff-bb263d587e92	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ0MTA4MWQxLTk5MDAtNDg4Yy1hNWZmLWJiMjYzZDU4N2U5MiIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiIyMDIzMDAwOEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU3NzI5NDEsImV4cCI6MTc3NTc3NjU0MX0.7SvffZuj2JmT0EqS7eVoz0D4cVaxABiQXQbwl7TImrc	2026-04-09 23:15:41.61+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-09 22:15:41.611+00	2026-04-09 22:15:41.611+00
3614eeed-376c-4290-83d2-168448374b2d	441081d1-9900-488c-a5ff-bb263d587e92	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ0MTA4MWQxLTk5MDAtNDg4Yy1hNWZmLWJiMjYzZDU4N2U5MiIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiIyMDIzMDAwOEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU3NzgxODAsImV4cCI6MTc3NTc4MTc4MH0.ZexBi7Y-hE7j4XfOGKqZiYRtYUxD7sNRspbES4geECg	2026-04-10 00:43:00.094+00	f	Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1	::1	2026-04-09 23:43:00.094+00	2026-04-09 23:43:00.094+00
16f1c389-f63a-4428-8c53-7fd1ee4ee025	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1Nzg4NDE3LCJleHAiOjE3NzU3OTIwMTd9.6q-J1y9M9wSe8uY48UXd13ErZMJIMhRj229812embJQ	2026-04-10 03:33:37.824+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-10 02:33:37.825+00	2026-04-10 02:33:37.825+00
9ceee6c7-414a-4416-b120-fd4cda41f15c	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU4MDE0OTEsImV4cCI6MTc3NTgwNTA5MX0.8zU4nBaTqCOdyDbF7UEDBI9AjMqhapFg6hKMmi1CLvU	2026-04-10 07:11:31.41+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-10 06:11:31.413+00	2026-04-10 06:11:31.413+00
f74daced-7d4b-4583-b713-ddac26132b2f	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1ODgwMjAyLCJleHAiOjE3NzU4ODM4MDJ9.nLsHnoQUl-DjKRtTjCPvZtjDmpi6DEIubZ0HJYPvjU4	2026-04-11 05:03:22.185+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-11 04:03:22.187+00	2026-04-11 04:03:22.187+00
19e3135e-a146-41ad-b149-38fffabcaa3e	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU4ODAyNzgsImV4cCI6MTc3NTg4Mzg3OH0.L8JO_Iy8bXBqSSW2T7Boz95DXlmVUISQUbrob5u0eAk	2026-04-11 05:04:38.844+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-11 04:04:38.844+00	2026-04-11 04:04:38.844+00
58fb0312-07e5-4432-b01f-ce9c15669a75	441081d1-9900-488c-a5ff-bb263d587e92	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ0MTA4MWQxLTk5MDAtNDg4Yy1hNWZmLWJiMjYzZDU4N2U5MiIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiIyMDIzMDAwOEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU5NTI2MzcsImV4cCI6MTc3NTk1NjIzN30.Z1-aGc1tKpsmDK2ukEgSkCzzbkYEpjEFRzy7wjPCGS0	2026-04-12 01:10:37.932+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-12 00:10:37.99+00	2026-04-12 00:10:37.99+00
f0a99a8d-4f76-4c13-acea-922f41a8206c	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1OTU5NDg2LCJleHAiOjE3NzU5NjMwODZ9.rGI0SBjR0F-2uFsSkWRQTiGL5oTf0fBRsEo6LXCG414	2026-04-12 03:04:46.595+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	2026-04-12 02:04:46.596+00	2026-04-12 02:04:46.596+00
542d99c4-5a14-458d-9a38-523ff4393caa	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1OTYzMzY3LCJleHAiOjE3NzU5NjY5Njd9.wtY2AhiGTH_Hbegd_blcftOS5vbLuD67eASak4HFC7A	2026-04-12 04:09:27.522+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-12 03:09:27.525+00	2026-04-12 03:09:27.525+00
e0dc552e-e6fa-4fc1-8e2b-f31b565a72c7	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1OTY2OTQ2LCJleHAiOjE3NzU5NzA1NDZ9.wlM4aYAknRVVNu3ci0ycbgNfCfBJh6Mi-McgQfMQYkk	2026-04-12 05:09:06.021+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	2026-04-12 04:09:06.022+00	2026-04-12 04:09:06.022+00
f5b91c86-3e2e-4a04-93fc-3746fffa63f3	441081d1-9900-488c-a5ff-bb263d587e92	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ0MTA4MWQxLTk5MDAtNDg4Yy1hNWZmLWJiMjYzZDU4N2U5MiIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiIyMDIzMDAwOEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU5Njc0MDgsImV4cCI6MTc3NTk3MTAwOH0.fHKhYesha4I3CMoP0-wbBReYrnTRpJUCt6Dr6JVjGrU	2026-04-12 05:16:48.829+00	f	Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1	::1	2026-04-12 04:16:48.83+00	2026-04-12 04:16:48.83+00
c9ce3f1b-8d80-4ddf-9e3f-3c1c22ac312e	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU5NjgwNDYsImV4cCI6MTc3NTk3MTY0Nn0.1YI0DJqvifa_wCJ3SnFSwk1vJsnqAzZSvp-uwSgUFwE	2026-04-12 05:27:26.83+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	127.0.0.1 (localhost)	2026-04-12 04:27:26.83+00	2026-04-12 04:27:26.83+00
b6f56799-6282-425a-bad3-1aa875058670	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1OTY4MDgwLCJleHAiOjE3NzU5NzE2ODB9.ysJrkLhFzMiUzzAyORVCs6RmX9C5pURW25KbNCNymss	2026-04-12 05:28:00.99+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	127.0.0.1 (localhost)	2026-04-12 04:28:00.99+00	2026-04-12 04:28:00.99+00
67d163f5-d317-4f22-9d47-994bf04c07ae	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU5Njg1NzYsImV4cCI6MTc3NTk3MjE3Nn0.LDLP3e1LSEq5Mz_UaOPs0JkMKV_-36QbJWiPCioPo7Q	2026-04-12 05:36:16.725+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	127.0.0.1 (localhost)	2026-04-12 04:36:16.725+00	2026-04-12 04:36:16.725+00
8a4e76ec-e208-4090-8c5d-33deb27e5c06	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1OTcwMDE5LCJleHAiOjE3NzU5NzM2MTl9.4-0ZWAj68ed9FMTOgL4HT9DMqVjlF1ROSLDq4CE7qq8	2026-04-12 06:00:19.716+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	127.0.0.1 (localhost)	2026-04-12 05:00:19.717+00	2026-04-12 05:00:19.717+00
dc8407e9-5bd0-40d3-94f9-84c3f9647784	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU5NzAwNjgsImV4cCI6MTc3NTk3MzY2OH0.knLw6TkAt8vDoAARZQF4AQXfrTorVZSQ7E4l27blX70	2026-04-12 06:01:08.32+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	127.0.0.1 (localhost)	2026-04-12 05:01:08.32+00	2026-04-12 05:01:08.32+00
6efb6bb3-d8cb-4c79-9da7-274a63c03501	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1OTcxMjMyLCJleHAiOjE3NzU5NzQ4MzJ9.ffggySWlBW4VPuvDnCvztc-_oKwGekAnFBSmZAsx0rU	2026-04-12 06:20:32.08+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	38.58.64.28	2026-04-12 05:20:32.082+00	2026-04-12 05:20:32.082+00
10e0aa9c-2364-4125-bbc2-5d2ba51a0152	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1OTcxNDc2LCJleHAiOjE3NzU5NzUwNzZ9.cU1epvENzaKvtyrZp6NCy6WU0zmhEjBbEdtx2kGmoCM	2026-04-12 06:24:36.58+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	38.58.64.28	2026-04-12 05:24:36.581+00	2026-04-12 05:24:36.581+00
12d2f3aa-e3a5-419f-bb53-8d255a4b1e92	441081d1-9900-488c-a5ff-bb263d587e92	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ0MTA4MWQxLTk5MDAtNDg4Yy1hNWZmLWJiMjYzZDU4N2U5MiIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiIyMDIzMDAwOEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU5NzE5MTAsImV4cCI6MTc3NTk3NTUxMH0.UpDRAZon3lezqzu3w8AjAezs7GgKBepLhis4bwdquwA	2026-04-12 06:31:50.311+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	38.58.64.131	2026-04-12 05:31:50.311+00	2026-04-12 05:31:50.311+00
6b5620c9-736d-4922-b74a-a13e69b86080	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1OTcxOTQ5LCJleHAiOjE3NzU5NzU1NDl9.K3jcbkqsWIERq7TUkuT3a8Dn5UZYWKpKrgapEbv-mBg	2026-04-12 06:32:29.577+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	38.58.64.131	2026-04-12 05:32:29.577+00	2026-04-12 05:32:29.577+00
48548e68-d4c1-497b-9516-cd8912950334	b5a950ac-2343-44ca-8859-0e3a8705a130	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI1YTk1MGFjLTIzNDMtNDRjYS04ODU5LTBlM2E4NzA1YTEzMCIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjYXN0cm9yb3Nhc2p1YW5tYW51ZWw3QGdtYWlsLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU5NzIyNjQsImV4cCI6MTc3NTk3NTg2NH0.Ks28quWFdD786tv9xnLsGy-wKv_20GTPY4iX5EnOto0	2026-04-12 06:37:44.276+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	38.58.64.131	2026-04-12 05:37:44.276+00	2026-04-12 05:37:44.276+00
0a6acd00-118a-4a53-83dc-f7d6a9c282c1	6867f584-0c07-4daf-a215-ec8ef1d620e8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NjdmNTg0LTBjMDctNGRhZi1hMjE1LWVjOGVmMWQ2MjBlOCIsInJvbGUiOiJlbnRyZW5hZG9yIiwiZW1haWwiOiIyMDIzMDAwNEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU5NzIzMjMsImV4cCI6MTc3NTk3NTkyM30.Tw7GOxXcZKQ3ObWmb027WHQdeW9DH4rKtde1hpFV974	2026-04-12 06:38:43.078+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	38.58.64.131	2026-04-12 05:38:43.078+00	2026-04-12 05:38:43.078+00
4329d2d1-9b2e-4c4e-9d82-28db709ac384	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1OTcyNjIxLCJleHAiOjE3NzU5NzYyMjF9.YL1OVIBXBCA8hRxef_Uj8cQktLyRmoWCbreTo8p8568	2026-04-12 06:43:41.077+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	38.58.64.28	2026-04-12 05:43:41.077+00	2026-04-12 05:43:41.077+00
b9f1b975-9216-475c-94e2-ff1cfd9b2d03	214b2a05-3583-4d04-bd56-400007abbb07	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIxNGIyYTA1LTM1ODMtNGQwNC1iZDU2LTQwMDAwN2FiYmIwNyIsInJvbGUiOiJlbnRyZW5hZG9yIiwiZW1haWwiOiJlbnRyZW5hZG9yM0B0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1OTcyNjU0LCJleHAiOjE3NzU5NzYyNTR9.KURpmNbYMh0ZI8cZZi719IcEw6lzJ5rb95_2JicWHug	2026-04-12 06:44:14.274+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	38.58.64.28	2026-04-12 05:44:14.275+00	2026-04-12 05:44:14.275+00
5bcc183f-9318-4fea-9dac-f72b6285e14e	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc1OTcyNjg4LCJleHAiOjE3NzU5NzYyODh9.AsmwNnuij46uHsjdOQDFL6Jb2Rr2qULoCiEQZWfkMK8	2026-04-12 06:44:48.773+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	38.58.64.28	2026-04-12 05:44:48.773+00	2026-04-12 05:44:48.773+00
6a45daef-c2a1-48a4-aa3c-ea2ebe72c077	ef71c219-0144-4c1f-903e-16cf0f2d4c88	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVmNzFjMjE5LTAxNDQtNGMxZi05MDNlLTE2Y2YwZjJkNGM4OCIsInJvbGUiOiJlbnRyZW5hZG9yIiwiZW1haWwiOiJlbnRyZW5hZG9yQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU5NzUyNDQsImV4cCI6MTc3NTk3ODg0NH0.rNj82DfI1eIyr8PgbmI5LP464zumjsSzcg_cfNPMoj0	2026-04-12 07:27:24.688+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	127.0.0.1 (localhost)	2026-04-12 06:27:24.689+00	2026-04-12 06:27:24.689+00
86ad4abc-2674-442f-9e85-5306142d94a0	6867f584-0c07-4daf-a215-ec8ef1d620e8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NjdmNTg0LTBjMDctNGRhZi1hMjE1LWVjOGVmMWQ2MjBlOCIsInJvbGUiOiJlbnRyZW5hZG9yIiwiZW1haWwiOiIyMDIzMDAwNEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU5NzUyNjksImV4cCI6MTc3NTk3ODg2OX0.PpBKXDubtfpXASLMVOO4pLTSCPxsHlqg8f7sY5zVaKM	2026-04-12 07:27:49.951+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	38.58.64.131	2026-04-12 06:27:49.952+00	2026-04-12 06:27:49.952+00
f2eca4df-1cbc-4428-bdd9-38a2b2e49a8a	ef71c219-0144-4c1f-903e-16cf0f2d4c88	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVmNzFjMjE5LTAxNDQtNGMxZi05MDNlLTE2Y2YwZjJkNGM4OCIsInJvbGUiOiJlbnRyZW5hZG9yIiwiZW1haWwiOiJlbnRyZW5hZG9yQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU5NzUyNzgsImV4cCI6MTc3NTk3ODg3OH0.JGcXTl4YH_FIWLMx7eQluQcbNMlAMqYh649NyWnX-4I	2026-04-12 07:27:58.036+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	127.0.0.1 (localhost)	2026-04-12 06:27:58.037+00	2026-04-12 06:27:58.037+00
9c47f8c7-3161-40a3-a026-9323f549c2ec	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU5NzU0MTMsImV4cCI6MTc3NTk3OTAxM30.jTQ3Z1UWZRa2j45veCjogGN5aBZocb4JUcJHkUnMdXE	2026-04-12 07:30:13.343+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	127.0.0.1 (localhost)	2026-04-12 06:30:13.344+00	2026-04-12 06:30:13.344+00
f16c6f1a-474d-4798-b324-90d9e1b70543	6867f584-0c07-4daf-a215-ec8ef1d620e8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NjdmNTg0LTBjMDctNGRhZi1hMjE1LWVjOGVmMWQ2MjBlOCIsInJvbGUiOiJlbnRyZW5hZG9yIiwiZW1haWwiOiIyMDIzMDAwNEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzU5Nzg5MTEsImV4cCI6MTc3NTk4MjUxMX0.ID9mrRR5DxrZJLAGiEYiwKWeDEzQGkl_f7660siLCU4	2026-04-12 08:28:31.443+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	38.58.64.131	2026-04-12 07:28:31.445+00	2026-04-12 07:28:31.445+00
d656be7b-262a-43d8-b4f8-efe8377f11af	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc2MDM3NTg4LCJleHAiOjE3NzYwNDExODh9.kqSaq9ODtyafWhA_A2fWxuzbrjzYlnojICVnRxk7UtA	2026-04-13 00:46:28.431+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	189.233.51.84	2026-04-12 23:46:28.432+00	2026-04-12 23:46:28.432+00
a21e4c32-027b-4c3c-ab5c-7db4860948b3	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc2MDkyMTM2LCJleHAiOjE3NzYwOTU3MzZ9.QyzdFKpfzjpf4rbZj67pchQCbK2ARKyEW8trI414q-E	2026-04-13 15:55:36.152+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	127.0.0.1 (localhost)	2026-04-13 14:55:36.155+00	2026-04-13 14:55:36.155+00
c6b713e5-3b78-4898-98b8-15455104eefd	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc2MDk2NTMxLCJleHAiOjE3NzYxMDAxMzF9.hfCcSlKGoC6qRLGiXod0qogDSgx-gpIpkoNTN7rIgk4	2026-04-13 17:08:51.09+00	f	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36	200.68.159.30	2026-04-13 16:08:51.091+00	2026-04-13 16:08:51.091+00
7ba74875-d979-42b5-b054-252728dc6a21	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc2MDk3MjU0LCJleHAiOjE3NzYxMDA4NTR9.N64be8ZMEk-mi0OIgwNdCnTGLdCLwx2AJExfn_S7fiw	2026-04-13 17:20:54.809+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	127.0.0.1 (localhost)	2026-04-13 16:20:54.812+00	2026-04-13 16:20:54.812+00
973d9a37-823f-46c6-b9a0-a12d86b530cb	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc2MDk3NjUxLCJleHAiOjE3NzYxMDEyNTF9.s17GBO7WSa9WhXcGhbmu3ueym4xYjILhnqUK7KyZxJk	2026-04-13 17:27:31.88+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0	201.97.73.229	2026-04-13 16:27:31.881+00	2026-04-13 16:27:31.881+00
62633b94-9075-4665-98ed-a5ab1fd96405	9b991004-40dc-499d-ab73-7a5edc57d7dc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliOTkxMDA0LTQwZGMtNDk5ZC1hYjczLTdhNWVkYzU3ZDdkYyIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJjbGllbnRlQHRpdGFuaXVtLmNvbSIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzYxMTc3MTksImV4cCI6MTc3NjEyMTMxOX0.ImAmVRbh3ObO0EcLcckvd4jYLCbxD7vC3DWcjg00hA0	2026-04-13 23:01:59.524+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	200.68.173.231	2026-04-13 22:01:59.525+00	2026-04-13 22:01:59.525+00
bfca2adf-f3fe-4781-acd4-94132159a45b	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc2MTE3NzQ2LCJleHAiOjE3NzYxMjEzNDZ9.gGGdhBSyUTIHgnJttZTW1lTe_juRmyQkY8jFiORY2pE	2026-04-13 23:02:26.624+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	200.68.173.231	2026-04-13 22:02:26.625+00	2026-04-13 22:02:26.625+00
a4a1bdad-4c1e-45c8-a0bb-c79da44a2f7b	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc2MTIwMzA5LCJleHAiOjE3NzYxMjM5MDl9.eSvtnkDfJBpVeHHZtdZXicpz7mOFS30eY26ryn84dhs	2026-04-13 23:45:09.1+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	200.68.173.231	2026-04-13 22:45:09.101+00	2026-04-13 22:45:09.101+00
8d42d422-6e3e-4595-832c-cdee46d7fc3e	62c88847-e53b-4e54-8b98-5e6be7387a72	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyYzg4ODQ3LWU1M2ItNGU1NC04Yjk4LTVlNmJlNzM4N2E3MiIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiIyMDIzMDA2MEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoiZ29vZ2xlIiwiaWF0IjoxNzc2MTI0MTcyLCJleHAiOjE3NzYxMjc3NzJ9.xRxT8u1HxY3yps4FP1hxRcmSUBdhPuSuBPIxsYO27cM	2026-04-14 00:49:32.806+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	201.97.79.64	2026-04-13 23:49:32.807+00	2026-04-13 23:49:32.807+00
1b7c5cff-d3ef-4919-a7d7-f71a219f0489	62c88847-e53b-4e54-8b98-5e6be7387a72	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyYzg4ODQ3LWU1M2ItNGU1NC04Yjk4LTVlNmJlNzM4N2E3MiIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiIyMDIzMDA2MEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoiZ29vZ2xlIiwiaWF0IjoxNzc2MTI0Njk5LCJleHAiOjE3NzYxMjgyOTl9.V9N1zkE1tvHPmQ2d2wXDKWjYww6LWSR3od0ebB296XE	2026-04-14 00:58:19.939+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	201.97.79.64	2026-04-13 23:58:19.94+00	2026-04-13 23:58:19.94+00
561aad51-7156-45d3-a1f9-cf3c2ec6edf9	441081d1-9900-488c-a5ff-bb263d587e92	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ0MTA4MWQxLTk5MDAtNDg4Yy1hNWZmLWJiMjYzZDU4N2U5MiIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiIyMDIzMDAwOEB1dGhoLmVkdS5teCIsImxvZ2luTWV0aG9kIjoibG9jYWwiLCJpYXQiOjE3NzYxMjQ3NjIsImV4cCI6MTc3NjEyODM2Mn0.EEnT6UCANnd6wMTh272FxQcAFALf4q4Qh8xzXM5319c	2026-04-14 00:59:22.636+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	201.97.79.64	2026-04-13 23:59:22.636+00	2026-04-13 23:59:22.636+00
272bde01-17a9-49ed-a332-d20177c1c177	adeaa659-4352-4525-a790-e86a5de0051e	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkZWFhNjU5LTQzNTItNDUyNS1hNzkwLWU4NmE1ZGUwMDUxZSIsInJvbGUiOiJjbGllbnRlIiwiZW1haWwiOiJhbGV4aXN5YXppcmhAZ21haWwuY29tIiwibG9naW5NZXRob2QiOiJsb2NhbCIsImlhdCI6MTc3NjEyNzY1NiwiZXhwIjoxNzc2MTMxMjU2fQ.IpbyqZUP3DSLRaL4yuaFPVpNzCbL1PxzeDlhRTuhxWA	2026-04-14 01:47:36.236+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	201.97.79.64	2026-04-14 00:47:36.237+00	2026-04-14 00:47:36.237+00
6cffeb72-6238-4340-b54a-7c1e4b13eade	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc2MTI4NTQ5LCJleHAiOjE3NzYxMzIxNDl9.t5jdyQxQHqDr5N7R-3lh6pSWN6GJAECkeMduadlXDQo	2026-04-14 02:02:29.591+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	127.0.0.1 (localhost)	2026-04-14 01:02:29.593+00	2026-04-14 01:02:29.593+00
9256e4da-494b-40a3-ae26-c875b52eb297	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc2MTM2ODU4LCJleHAiOjE3NzYxNDA0NTh9.hXagQ_qVIBxFyUOGlkrAqkcPlCtVB4fcOJDYAdEa0K8	2026-04-14 04:20:58.844+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	127.0.0.1 (localhost)	2026-04-14 03:20:58.845+00	2026-04-14 03:20:58.845+00
e16c4091-8baf-4d96-86bf-a5b4a3081983	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc2MTM3MDMzLCJleHAiOjE3NzYxNDA2MzN9.mR4l6A-MferjvtvCvezeal76knAzNKfGYmvUmVlzXs8	2026-04-14 04:23:53.955+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	38.58.64.50	2026-04-14 03:23:53.957+00	2026-04-14 03:23:53.957+00
09447250-6d7c-467b-b3b0-bd59b56c2995	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc2MTM3MDU0LCJleHAiOjE3NzYxNDA2NTR9.kevVBjL6Dsf9N712rwEfd50_aIhhg53uw06diIXSo54	2026-04-14 04:24:14.862+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	38.58.64.50	2026-04-14 03:24:14.862+00	2026-04-14 03:24:14.862+00
da6299ba-98b2-4eea-b5bd-8ea7b48c9d2e	e2b8251c-a695-40d9-aafc-5cd838525c53	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyYjgyNTFjLWE2OTUtNDBkOS1hYWZjLTVjZDgzODUyNWM1MyIsInJvbGUiOiJhZG1pbmlzdHJhZG9yIiwiZW1haWwiOiJhZG1pbkB0aXRhbml1bS5jb20iLCJsb2dpbk1ldGhvZCI6ImxvY2FsIiwiaWF0IjoxNzc2MTM4MzI0LCJleHAiOjE3NzYxNDE5MjR9.k217GZ2pBucPlF6qiSbJ1HpzYNt0H4KoDMjV7F4ssdQ	2026-04-14 04:45:24.643+00	f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	127.0.0.1 (localhost)	2026-04-14 03:45:24.646+00	2026-04-14 03:45:24.646+00
\.


--
-- Name: AboutPages_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."AboutPages_id_seq"', 1, true);


--
-- Name: AboutTeamMembers_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."AboutTeamMembers_id_seq"', 3, true);


--
-- Name: AboutValues_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."AboutValues_id_seq"', 4, true);


--
-- Name: Brands_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."Brands_id_seq"', 13, true);


--
-- Name: Categories_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."Categories_id_seq"', 6, true);


--
-- Name: Products_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."Products_id_seq"', 101, true);


--
-- Name: product_images_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.product_images_id_seq', 20, true);


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

\unrestrict hvVHBXG4U1ZUpXOjCtxgvJicpuT5UBKzEld57JaRdcGoXof4iPHN8Rj0Y3gLygO

