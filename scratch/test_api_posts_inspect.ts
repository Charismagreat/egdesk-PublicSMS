async function inspectApiPosts() {
  for (const port of [4000, 4002, 3000]) {
    try {
      const res = await fetch(`http://localhost:${port}/api/naver-blog/posts`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Port ${port} success: ${data.success}, posts count: ${data.posts?.length}`);
        const p8 = data.posts?.find((p: any) => p.id === 8);
        console.log(`Port ${port} Post 8:`, p8);
      }
    } catch (e) {
      console.log(`Port ${port} fetch error:`, (e as any).message);
    }
  }
}

inspectApiPosts().catch(console.error);
