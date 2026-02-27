"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultipleFileUploadMain = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const multiple_file_upload_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/MultipleFileUpload/multiple-file-upload"));
const react_styles_1 = require("@patternfly/react-styles");
const MultipleFileUploadTitle_1 = require("./MultipleFileUploadTitle");
const MultipleFileUploadButton_1 = require("./MultipleFileUploadButton");
const MultipleFileUploadInfo_1 = require("./MultipleFileUploadInfo");
const MultipleFileUploadMain = (_a) => {
    var { className, titleIcon, titleText, titleTextSeparator, infoText, isUploadButtonHidden, browseButtonText = 'Upload' } = _a, props = tslib_1.__rest(_a, ["className", "titleIcon", "titleText", "titleTextSeparator", "infoText", "isUploadButtonHidden", "browseButtonText"]);
    const showTitle = !!titleIcon || !!titleText || !!titleTextSeparator;
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(multiple_file_upload_1.default.multipleFileUploadMain, className) }, props, { children: [showTitle && (0, jsx_runtime_1.jsx)(MultipleFileUploadTitle_1.MultipleFileUploadTitle, { icon: titleIcon, text: titleText, textSeparator: titleTextSeparator }), isUploadButtonHidden || (0, jsx_runtime_1.jsx)(MultipleFileUploadButton_1.MultipleFileUploadButton, { browseButtonText: browseButtonText }), !!infoText && (0, jsx_runtime_1.jsx)(MultipleFileUploadInfo_1.MultipleFileUploadInfo, { children: infoText })] })));
};
exports.MultipleFileUploadMain = MultipleFileUploadMain;
exports.MultipleFileUploadMain.displayName = 'MultipleFileUploadMain';
//# sourceMappingURL=MultipleFileUploadMain.js.map