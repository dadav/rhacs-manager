"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultipleFileUploadInfo = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const multiple_file_upload_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/MultipleFileUpload/multiple-file-upload"));
const react_styles_1 = require("@patternfly/react-styles");
const MultipleFileUploadInfo = (_a) => {
    var { className, children } = _a, props = tslib_1.__rest(_a, ["className", "children"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(multiple_file_upload_1.default.multipleFileUploadInfo, className) }, props, { children: children })));
};
exports.MultipleFileUploadInfo = MultipleFileUploadInfo;
exports.MultipleFileUploadInfo.displayName = 'MultipleFileUploadInfo';
//# sourceMappingURL=MultipleFileUploadInfo.js.map