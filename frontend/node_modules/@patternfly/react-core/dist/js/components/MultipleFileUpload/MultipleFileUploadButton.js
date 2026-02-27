"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultipleFileUploadButton = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const multiple_file_upload_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/MultipleFileUpload/multiple-file-upload"));
const react_styles_1 = require("@patternfly/react-styles");
const MultipleFileUpload_1 = require("./MultipleFileUpload");
const Button_1 = require("../Button");
const MultipleFileUploadButton = (_a) => {
    var { className, 'aria-label': ariaLabel, browseButtonText = 'Upload' } = _a, props = tslib_1.__rest(_a, ["className", 'aria-label', "browseButtonText"]);
    if (!ariaLabel && !browseButtonText) {
        // eslint-disable-next-line no-console
        console.warn("For accessibility reasons an aria-label should be specified on MultipleFileUploadButton if a browseButtonText isn't");
    }
    const { open } = (0, react_1.useContext)(MultipleFileUpload_1.MultipleFileUploadContext);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(multiple_file_upload_1.default.multipleFileUploadUpload, className) }, props, { children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "secondary", "aria-label": ariaLabel, onClick: open, children: browseButtonText }) })));
};
exports.MultipleFileUploadButton = MultipleFileUploadButton;
exports.MultipleFileUploadButton.displayName = 'MultipleFileUploadButton';
//# sourceMappingURL=MultipleFileUploadButton.js.map