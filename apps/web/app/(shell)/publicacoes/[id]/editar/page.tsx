import { PostEditPage } from "./post-edit-page"

export default async function EditarPublicacaoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PostEditPage postId={id} />
}
