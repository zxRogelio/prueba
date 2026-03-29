--
-- PostgreSQL database dump
--

\restrict rfDNPXT5IiD7RhaTEinioURCYrMnBvWPS6D5qGAjONByKsjgKOgoxuT21UDUe2v

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
-- Name: Brands id; Type: DEFAULT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Brands" ALTER COLUMN id SET DEFAULT nextval('core."Brands_id_seq"'::regclass);


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
-- Name: Brands_id_seq; Type: SEQUENCE SET; Schema: core; Owner: -
--

SELECT pg_catalog.setval('core."Brands_id_seq"', 12, true);


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
-- Name: Brands Brands_categoryId_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core."Brands"
    ADD CONSTRAINT "Brands_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES core."Categories"(id_categoria) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict rfDNPXT5IiD7RhaTEinioURCYrMnBvWPS6D5qGAjONByKsjgKOgoxuT21UDUe2v

