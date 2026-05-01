'use client';
import { useParams } from 'next/navigation';
import BlogForm from '../../../../components/admin/BlogForm';

export default function EditPage() {
  const { id } = useParams();
  return <BlogForm blogId={id} />;
}
