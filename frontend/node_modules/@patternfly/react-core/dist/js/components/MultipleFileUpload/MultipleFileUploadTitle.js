"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultipleFileUploadTitle = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const multiple_file_upload_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/MultipleFileUpload/multiple-file-upload"));
const react_styles_1 = require("@patternfly/react-styles");
const MultipleFileUploadTitleIcon_1 = require("./MultipleFileUploadTitleIcon");
const MultipleFileUploadTitleText_1 = require("./MultipleFileUploadTitleText");
const MultipleFileUploadTitleTextSeparator_1 = require("./MultipleFileUploadTitleTextSeparator");
const MultipleFileUploadTitle = (_a) => {
    var { className, icon, text = '', textSeparator = '' } = _a, props = tslib_1.__rest(_a, ["className", "icon", "text", "textSeparator"]);
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(multiple_file_upload_1.default.multipleFileUploadTitle, className) }, props, { children: [icon && (0, jsx_runtime_1.jsx)(MultipleFileUploadTitleIcon_1.MultipleFileUploadTitleIcon, { children: icon }), text && ((0, jsx_runtime_1.jsxs)(MultipleFileUploadTitleText_1.MultipleFileUploadTitleText, { children: [`${text} `, textSeparator && (0, jsx_runtime_1.jsx)(MultipleFileUploadTitleTextSeparator_1.MultipleFileUploadTitleTextSeparator, { children: textSeparator })] }))] })));
};
exports.MultipleFileUploadTitle = MultipleFileUploadTitle;
exports.MultipleFileUploadTitle.displayName = 'MultipleFileUploadTitle';
//# sourceMappingURL=MultipleFileUploadTitle.js.map