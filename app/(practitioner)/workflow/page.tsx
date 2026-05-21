import { redirect } from 'next/navigation';

// Workflow root redirects to Sessions as the default view
export default function WorkflowPage() {
  redirect('/workflow/sessions');
}
