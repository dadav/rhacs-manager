import { useState } from "react";
import {
  Alert,
  Button,
  Content,
  ExpandableSection,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";
import { useTranslation } from "react-i18next";
import {
  GITHUB_RELEASES_URL,
  findRelease,
  getReleases,
  hasUnseenRelease,
  readLastSeenVersion,
  visibleReleases,
  writeLastSeenVersion,
  type Release,
  type ReleaseKind,
} from "../releases/releaseNotes";

const KIND_COLORS: Record<ReleaseKind, "blue" | "teal" | "green" | "red"> = {
  feature: "blue",
  improvement: "teal",
  fix: "green",
  security: "red",
};

const TITLE_ID = "whats-new-title";

function ReleaseItems({ release }: { release: Release }) {
  const { t } = useTranslation();
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
      {release.items.map((item) => (
        <li key={item.id} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <Label isCompact color={KIND_COLORS[item.kind]} style={{ flexShrink: 0 }}>
            {t(`whatsNew.kind.${item.kind}`)}
          </Label>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

function OlderRelease({ release }: { release: Release }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <ExpandableSection
      toggleText={`v${release.version} (${release.date})`}
      isExpanded={isExpanded}
      onToggle={(_event, expanded) => setIsExpanded(expanded)}
    >
      <ReleaseItems release={release} />
    </ExpandableSection>
  );
}

interface WhatsNewModalProps {
  currentVersion: string;
  isOpen: boolean;
  onClose: () => void;
}

// Stays mounted (isOpen toggles) so the PF focus trap returns focus to the link on close.
function WhatsNewModal({ currentVersion, isOpen, onClose }: WhatsNewModalProps) {
  const { t, i18n } = useTranslation();
  const releases = visibleReleases(getReleases(i18n.language), currentVersion);
  const current = findRelease(releases, currentVersion);
  const older = releases.filter((release) => release !== current);

  return (
    <Modal
      isOpen={isOpen}
      variant="medium"
      aria-labelledby={TITLE_ID}
      // No onClose: PF6 would render a header close button with a hardcoded English label.
      onEscapePress={onClose}
    >
      <ModalHeader labelId={TITLE_ID} title={t("whatsNew.title", { version: currentVersion })} />
      <ModalBody>
        {current ? (
          <section aria-label={`v${current.version}`}>
            <Content component="small" style={{ display: "block", marginBottom: 12 }}>
              {current.date}
            </Content>
            <ReleaseItems release={current} />
          </section>
        ) : (
          <Alert variant="info" isInline isPlain title={t("whatsNew.noNotesForVersion")} />
        )}
        {older.length > 0 && (
          <section style={{ marginTop: 24 }}>
            <Content component="h3" style={{ marginBottom: 8 }}>
              {t("whatsNew.earlierReleases")}
            </Content>
            {older.map((release) => (
              <OlderRelease key={release.version} release={release} />
            ))}
          </section>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          {t("common.close")}
        </Button>
        <Button
          variant="link"
          component="a"
          href={`${GITHUB_RELEASES_URL}/v${currentVersion}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("whatsNew.viewOnGithub")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

interface WhatsNewLinkProps {
  currentVersion: string;
}

/** Sidebar "What's new?" link with an unseen-release dot and the release notes modal. */
export function WhatsNewLink({ currentVersion }: WhatsNewLinkProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isUnseen, setIsUnseen] = useState(() =>
    hasUnseenRelease(getReleases(i18n.language), currentVersion, readLastSeenVersion()),
  );

  const open = () => {
    writeLastSeenVersion(currentVersion);
    setIsUnseen(false);
    setIsOpen(true);
  };

  return (
    <>
      <Button variant="link" isInline size="sm" onClick={open} style={{ fontSize: "inherit" }}>
        {t("whatsNew.label")}
        {isUnseen && (
          <>
            <span
              aria-hidden="true"
              data-testid="whats-new-dot"
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                marginLeft: 6,
                borderRadius: "50%",
                verticalAlign: "middle",
                background: "var(--pf-t--global--color--status--info--default)",
              }}
            />
            <span className="pf-v6-screen-reader"> ({t("whatsNew.newIndicator")})</span>
          </>
        )}
      </Button>
      <WhatsNewModal currentVersion={currentVersion} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
