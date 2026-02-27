"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUploadHelperText = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const file_upload_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/FileUpload/file-upload"));
const react_styles_1 = require("@patternfly/react-styles");
const FileUploadHelperText = (_a) => {
    var { children, className } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(`${file_upload_1.default.fileUpload}__helper-text`, className) }, props, { children: children })));
};
exports.FileUploadHelperText = FileUploadHelperText;
exports.FileUploadHelperText.displayName = 'FileUploadHelperText';
//# sourceMappingURL=FileUploadHelperText.js.map