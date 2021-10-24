import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "use-intl";
import Head from "next/head";
import { Layout } from "components/Layout";
import { StatusesArea } from "components/leo/StatusesArea";
import { useAreaOfPlay } from "hooks/useAreaOfPlay";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import { GetServerSideProps } from "next";
import { ActiveOfficer, useLeoState } from "state/leoState";
import { Officer, RecordType } from "types/prisma";
import { ActiveCalls } from "components/leo/ActiveCalls";
import { Full911Call, FullBolo, useDispatchState } from "state/dispatchState";
import { ModalButtons } from "components/leo/ModalButtons";
import { ActiveBolos } from "components/active-bolos/ActiveBolos";
import { CreateWarrant } from "components/leo/CreateWarrant";
import { useTime } from "hooks/useTime";
import { requestAll } from "lib/utils";

const NotepadModal = dynamic(async () => {
  return (await import("components/modals/NotepadModal")).NotepadModal;
});

const SelectOfficerModal = dynamic(async () => {
  return (await import("components/leo/modals/SelectOfficerModal")).SelectOfficerModal;
});

const ActiveOfficersModal = dynamic(async () => {
  return (await import("components/leo/modals/ActiveOfficers")).ActiveOfficersModal;
});

const CreateTicketModal = dynamic(async () => {
  return (await import("components/leo/modals/CreateTicketModal")).CreateTicketModal;
});

const WeaponSearchModal = dynamic(async () => {
  return (await import("components/leo/modals/WeaponSearchModal")).WeaponSearchModal;
});

const VehicleSearchModal = dynamic(async () => {
  return (await import("components/leo/modals/VehicleSearchModal")).VehicleSearchModal;
});

const NameSearchModal = dynamic(async () => {
  return (await import("components/leo/modals/NameSearchModal/NameSearchModal")).NameSearchModal;
});

interface Props {
  officers: Officer[];
  activeOfficer: ActiveOfficer | null;
  calls: Full911Call[];
  bolos: FullBolo[];
}

export default function OfficerDashboard({ officers, bolos, calls, activeOfficer }: Props) {
  const { showAop, areaOfPlay } = useAreaOfPlay();
  const state = useLeoState();
  const { setCalls, setBolos } = useDispatchState();
  const timeRef = useTime();
  const t = useTranslations("Leo");

  React.useEffect(() => {
    state.setActiveOfficer(activeOfficer);
    state.setOfficers(officers);
    setCalls(calls);
    setBolos(bolos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.setActiveOfficer,
    state.setOfficers,
    setBolos,
    setCalls,
    bolos,
    calls,
    officers,
    activeOfficer,
  ]);

  return (
    <Layout className="max-w-[100rem]">
      <Head>
        <title>{t("officer")} - SnailyCAD</title>
      </Head>

      <div className="w-full bg-gray-200/80 rounded-md overflow-hidden">
        <header className="flex items-center justify-between px-4 py-2 bg-gray-300 mb-2">
          <h3 className="text-xl font-semibold">
            {t("utilityPanel")}
            {showAop ? <span> - AOP: {areaOfPlay}</span> : null}
          </h3>

          <span ref={timeRef} />
        </header>

        <div className="px-4">
          <ModalButtons />
        </div>

        <StatusesArea />
      </div>

      <div className="flex flex-col md:flex-row md:space-x-3 mt-3">
        <div className="w-full">
          <ActiveCalls />
          <ActiveBolos />
        </div>
        <div className="w-full md:w-96 mt-3 md:mt-0">
          <CreateWarrant />
        </div>
      </div>

      <SelectOfficerModal />
      <NotepadModal />
      <ActiveOfficersModal />
      <WeaponSearchModal />
      <VehicleSearchModal />
      <NameSearchModal />

      <div>
        <CreateTicketModal type={RecordType.TICKET} />
        <CreateTicketModal type={RecordType.ARREST_REPORT} />
        <CreateTicketModal type={RecordType.WRITTEN_WARNING} />
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, locale }) => {
  const [{ officers, citizens }, activeOfficer, values, calls, bolos] = await requestAll(req, [
    ["/leo", { officers: [], citizens: [] }],
    ["/leo/active-officer", null],
    ["/admin/values/codes_10?paths=penal_code", []],
    ["/911-calls", []],
    ["/bolos", []],
  ]);

  return {
    props: {
      session: await getSessionUser(req.headers),
      activeOfficer,
      officers,
      calls,
      bolos,
      values,
      citizens,
      messages: {
        ...(await getTranslations(["citizen", "leo", "calls", "common"], locale)),
      },
    },
  };
};
