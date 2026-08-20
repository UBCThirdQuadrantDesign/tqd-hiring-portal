import { getApplicationDetail } from "../../../actions";
import { ApplicationDrawer } from "@/components/application-drawer";

export default async function InterceptedDrawerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { application, attachments, notes } = await getApplicationDetail(id);

  return (
    <ApplicationDrawer
      application={application}
      attachments={attachments}
      notes={notes}
      mode="modal"
    />
  );
}
