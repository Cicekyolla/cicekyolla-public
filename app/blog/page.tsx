import type { Metadata } from "next";
import { BlogExperience } from "@/components/blog/BlogExperience";
import { getBlogPosts } from "@/lib/blog";
export const metadata:Metadata={title:"Çiçek Blogu — Bakım ve Hediye Rehberleri | ÇiçekYolla",description:"Çiçek bakımı, gül renklerinin anlamları, orkide rehberleri ve özel günler için uzman önerileri."};
export const revalidate=300;
export default async function BlogPage(){return <BlogExperience posts={await getBlogPosts()}/>}
