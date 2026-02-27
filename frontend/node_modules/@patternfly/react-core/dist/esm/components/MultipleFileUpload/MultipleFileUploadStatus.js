import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import styles from '@patternfly/react-styles/css/components/MultipleFileUpload/multiple-file-upload.mjs';
import { css } from '@patternfly/react-styles';
import { ExpandableSection } from '../ExpandableSection';
import { GenerateId } from '../../helpers/GenerateId/GenerateId';
import InProgressIcon from '@patternfly/react-icons/dist/esm/icons/in-progress-icon';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import TimesCircleIcon from '@patternfly/react-icons/dist/esm/icons/times-circle-icon';
export const MultipleFileUploadStatus = (_a) => {
    var { children, className, statusToggleText, statusToggleIcon, 'aria-label': ariaLabel } = _a, props = __rest(_a, ["children", "className", "statusToggleText", "statusToggleIcon", 'aria-label']);
    const [icon, setIcon] = useState();
    const [isOpen, setIsOpen] = useState(true);
    useEffect(() => {
        switch (statusToggleIcon) {
            case 'danger':
                setIcon(_jsx(TimesCircleIcon, {}));
                break;
            case 'success':
                setIcon(_jsx(CheckCircleIcon, {}));
                break;
            case 'inProgress':
                setIcon(_jsx(InProgressIcon, {}));
                break;
            default:
                setIcon(statusToggleIcon);
        }
    }, [statusToggleIcon]);
    const toggle = (_jsxs("div", { className: styles.multipleFileUploadStatusProgress, children: [_jsx("div", { className: `${styles.multipleFileUploadStatusProgress}-icon`, children: icon }), _jsx("div", { className: `${styles.multipleFileUploadStatusProgress}-text`, children: statusToggleText })] }));
    const toggleExpandableSection = () => {
        setIsOpen(!isOpen);
    };
    return (_jsx("div", Object.assign({ className: css(styles.multipleFileUploadStatus, className) }, props, { children: _jsx(GenerateId, { prefix: "pf-expandable-section-", children: (expandableSectionId) => (_jsx(ExpandableSection, { contentId: `${expandableSectionId}-content`, toggleId: `${expandableSectionId}-toggle`, toggleContent: toggle, isExpanded: isOpen, onToggle: toggleExpandableSection, children: _jsx("ul", { className: `${styles.multipleFileUploadStatus}-list`, role: "list", "aria-label": ariaLabel, children: children }) })) }) })));
};
MultipleFileUploadStatus.displayName = 'MultipleFileUploadStatus';
//# sourceMappingURL=MultipleFileUploadStatus.js.map