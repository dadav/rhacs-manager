"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultipleFileUploadStatus = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const multiple_file_upload_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/MultipleFileUpload/multiple-file-upload"));
const react_styles_1 = require("@patternfly/react-styles");
const ExpandableSection_1 = require("../ExpandableSection");
const GenerateId_1 = require("../../helpers/GenerateId/GenerateId");
const in_progress_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/in-progress-icon'));
const check_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/check-circle-icon'));
const times_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/times-circle-icon'));
const MultipleFileUploadStatus = (_a) => {
    var { children, className, statusToggleText, statusToggleIcon, 'aria-label': ariaLabel } = _a, props = tslib_1.__rest(_a, ["children", "className", "statusToggleText", "statusToggleIcon", 'aria-label']);
    const [icon, setIcon] = (0, react_1.useState)();
    const [isOpen, setIsOpen] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        switch (statusToggleIcon) {
            case 'danger':
                setIcon((0, jsx_runtime_1.jsx)(times_circle_icon_1.default, {}));
                break;
            case 'success':
                setIcon((0, jsx_runtime_1.jsx)(check_circle_icon_1.default, {}));
                break;
            case 'inProgress':
                setIcon((0, jsx_runtime_1.jsx)(in_progress_icon_1.default, {}));
                break;
            default:
                setIcon(statusToggleIcon);
        }
    }, [statusToggleIcon]);
    const toggle = ((0, jsx_runtime_1.jsxs)("div", { className: multiple_file_upload_1.default.multipleFileUploadStatusProgress, children: [(0, jsx_runtime_1.jsx)("div", { className: `${multiple_file_upload_1.default.multipleFileUploadStatusProgress}-icon`, children: icon }), (0, jsx_runtime_1.jsx)("div", { className: `${multiple_file_upload_1.default.multipleFileUploadStatusProgress}-text`, children: statusToggleText })] }));
    const toggleExpandableSection = () => {
        setIsOpen(!isOpen);
    };
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(multiple_file_upload_1.default.multipleFileUploadStatus, className) }, props, { children: (0, jsx_runtime_1.jsx)(GenerateId_1.GenerateId, { prefix: "pf-expandable-section-", children: (expandableSectionId) => ((0, jsx_runtime_1.jsx)(ExpandableSection_1.ExpandableSection, { contentId: `${expandableSectionId}-content`, toggleId: `${expandableSectionId}-toggle`, toggleContent: toggle, isExpanded: isOpen, onToggle: toggleExpandableSection, children: (0, jsx_runtime_1.jsx)("ul", { className: `${multiple_file_upload_1.default.multipleFileUploadStatus}-list`, role: "list", "aria-label": ariaLabel, children: children }) })) }) })));
};
exports.MultipleFileUploadStatus = MultipleFileUploadStatus;
exports.MultipleFileUploadStatus.displayName = 'MultipleFileUploadStatus';
//# sourceMappingURL=MultipleFileUploadStatus.js.map