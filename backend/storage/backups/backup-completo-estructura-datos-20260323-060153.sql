--
-- PostgreSQL database dump
--

\restrict bHzwMc0pkK44P7DfSjNBc9lYGb9QwbRSfqlbnPavWOgCmnNW8A1yvtQOVbyKhBm

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
85	15	Cinturón de levantamiento Reebok	8	4	650.00	5	Activo	\N	Ropa	Cinturón de gimnasio diseñado para proteger la zona lumbar durante ejercicios de fuerza como peso muerto o sentadilla	["Soporte lumbar reforzado"]	\N	\N	\N	M / G	Negro / Rojo	Cuero sintético	2026-03-12 22:14:08.377+00	2026-03-12 22:14:08.377+00
86	16	Guantes de entrenamiento Nike	10	4	420.00	10	Activo	\N	Ropa	Guantes deportivos que mejoran el agarre y protegen las manos durante el levantamiento de pesas.	["Antideslizantes y transpirables"]	\N	\N	\N	CH / M / G	Negro	Poliéster / Spandex	2026-03-12 22:16:59.406+00	2026-03-12 22:16:59.406+00
87	17	Tennis Prueba	11	5	1500.00	100	Activo	\N	Ropa	Prueba	[]	\N	\N	\N	M	Azul	Algodon	2026-03-16 23:33:59.63+00	2026-03-16 23:33:59.63+00
90	18	Bandas de resistencia Adidas	9	4	450.00	6	Activo	\N	Ropa	Bandas elásticas ideales para entrenamiento funcional, calentamiento o rehabilitación.	["Diferentes niveles de resistencia"]	\N	\N	\N	Única	Negro	Azul / Negro	2026-03-19 18:12:48.286+00	2026-03-19 18:12:48.286+00
91	19	Straps de levantamiento Harbinger	9	4	500.00	5	Activo	\N	Ropa	Correas de levantamiento que ayudan a mejorar el agarre en ejercicios como peso muerto o remo.	[]	\N	\N	\N	Única	Negro	Piel	2026-03-19 18:17:17.416+00	2026-03-19 18:17:17.416+00
96	20	Cinturón de pesas Gymreapers	8	4	390.00	12	Activo	\N	Ropa	Guantes diseñados para mejorar el agarre y reducir ampollas durante el entrenamiento.	["Palma acolchada"]	\N	\N	\N	CH / M / G	Negro / Gris	Poliéster	2026-03-19 18:21:25.094+00	2026-03-19 18:21:25.094+00
97	21	Producto IAST 1	12	6	1500.00	50	Activo	\N	Ropa	Producto de prueba IAST	[]	\N	\N	\N	M	Negro	Algodon	2026-03-22 06:19:31.104+00	2026-03-22 06:19:31.104+00
98	22	Producto IAST Invalido	12	6	-1500.00	-50	Activo	\N	Ropa	Producto de prueba Invalido	[]	\N	\N	\N	M	Negro	Algodon	2026-03-22 06:25:16.69+00	2026-03-22 06:25:16.69+00
13	13	Tennis Adidas Elite Morado	2	2	1500.00	3	Inactivo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773351955/titanium/products/zt0vkaawatodqdlwh0jr.jpg	Ropa	Tennis	[]	\N	\N	\N	G	Morado	Sintetico	2026-03-12 05:21:21.945547+00	2026-03-22 06:40:45.509+00
4	4	Tennis Adidas Clásico Negro	2	2	1000.00	10	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773308505/titanium/products/gijycqnyokjl4almgx0f.jpg	Ropa	Tennis	[]	\N	\N	\N	M	Negro	Algodon	2026-03-12 05:21:21.945547+00	2026-03-12 09:41:45.813+00
11	11	Tennis Adidas Comfort Beige	2	2	1080.00	11	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773310154/titanium/products/anb6jws0dpedg7lsjdee.jpg	Ropa	Tennis	[]	\N	\N	\N	M	Beige	Algodon	2026-03-12 05:21:21.945547+00	2026-03-12 10:09:15.026+00
46	14	Sudadera Alo	7	3	1110.00	10	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773337807/titanium/products/yr00hgjzp2bslrcnaid3.jpg	Ropa	Sudadera comoda	["Comodo","Fresco"]	\N	\N	\N	M	Negro	Poliester	2026-03-12 17:50:08.201+00	2026-03-12 17:50:08.201+00
9	9	Tennis Adidas Light Rosa	2	2	1100.00	9	Activo	https://res.cloudinary.com/dqf9pdcte/image/upload/v1773351971/titanium/products/rhqu3nqb2oxbjjjxjs7d.jpg	Ropa	Tennis	[]	\N	\N	\N	CH	Rosa	Textil	2026-03-12 05:21:21.945547+00	2026-03-12 21:46:11.862+00
\.


--
-- Data for Name: Users; Type: TABLE DATA; Schema: core; Owner: -
--

COPY core."Users" (id, email, password, otp, "otpExpires", "isVerified", "isPendingApproval", "accessToken", "totpSecret", "authMethod", role, provider, "providerId", "passwordChangesCount", "passwordChangesDate", "createdAt", "updatedAt") FROM stdin;
e2b8251c-a695-40d9-aafc-5cd838525c53	admin@titanium.com	$2b$10$m1NFF4wNJ/gTrXzz2Cw3telkpHFBFsfTFeHJplMR07157oSQJcTJy	\N	\N	t	f	\N	\N	normal	administrador	local	\N	0	\N	2026-03-04 05:02:30.840499+00	2026-03-04 05:02:30.840499+00
ec96ac21-803c-420b-b329-b8a77ae379dc	castrorosajm@gmail.com	$2b$10$g49tZJxHUd7bXH9KBAHv7.b53EPkj5gIy9Mc.eCH/wMzGx6r4ixay	\N	\N	f	f	\N	\N	normal	cliente	local	\N	0	\N	2026-03-19 07:56:53.047+00	2026-03-19 07:56:53.047+00
ef71c219-0144-4c1f-903e-16cf0f2d4c88	entrenador@titanium.com	$2b$10$OrM2nfSKlIxQpiJ/VElFsOZxWKUi4dnF3hqUcYLdUDKJFuG8w1ovK	\N	\N	t	f	\N	\N	normal	entrenador	local	\N	0	\N	2026-03-22 18:23:24.35+00	2026-03-22 18:23:24.35+00
9b991004-40dc-499d-ab73-7a5edc57d7dc	cliente@titanium.com	$2b$10$vnERiv/c9kwMMq9bagipH.bUR6t3ZJ8UkTUGy6YmKO17ZE/wV7rJC	\N	\N	t	f	\N	\N	normal	cliente	local	\N	0	\N	2026-03-22 18:23:24.613+00	2026-03-22 18:23:24.613+00
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
\.


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

SELECT pg_catalog.setval('core."Products_id_seq"', 99, true);


--
-- Name: product_images_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.product_images_id_seq', 13, true);


--
-- Name: products_id_producto_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core.products_id_producto_seq', 83, true);


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

\unrestrict bHzwMc0pkK44P7DfSjNBc9lYGb9QwbRSfqlbnPavWOgCmnNW8A1yvtQOVbyKhBm

