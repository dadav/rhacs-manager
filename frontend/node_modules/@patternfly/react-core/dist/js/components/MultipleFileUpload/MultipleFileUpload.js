"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultipleFileUpload = exports.MultipleFileUploadContext = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dropzone_1 = require("react-dropzone");
const multiple_file_upload_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/MultipleFileUpload/multiple-file-upload"));
const react_styles_1 = require("@patternfly/react-styles");
exports.MultipleFileUploadContext = (0, react_1.createContext)({
    open: () => { }
});
const MultipleFileUpload = (_a) => {
    var { className, children, dropzoneProps = {}, isHorizontal, onFileDrop = () => { } } = _a, props = tslib_1.__rest(_a, ["className", "children", "dropzoneProps", "isHorizontal", "onFileDrop"]);
    const onDropAccepted = (acceptedFiles, event) => {
        onFileDrop(event, acceptedFiles);
        // allow users to set a custom drop accepted handler rather than using on data change
        dropzoneProps.onDropAccepted && dropzoneProps.onDropAccepted(acceptedFiles, event);
    };
    const { getRootProps, getInputProps, isDragActive, open } = (0, react_dropzone_1.useDropzone)(Object.assign(Object.assign({ multiple: true }, dropzoneProps), { onDropAccepted }));
    const rootProps = getRootProps(Object.assign(Object.assign({}, props), { onClick: (event) => event.stopPropagation() // Prevents clicking TextArea from opening file dialog
     }));
    return ((0, jsx_runtime_1.jsx)(exports.MultipleFileUploadContext.Provider, { value: { open }, children: (0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(multiple_file_upload_1.default.multipleFileUpload, isDragActive && multiple_file_upload_1.default.modifiers.dragOver, isHorizontal && multiple_file_upload_1.default.modifiers.horizontal, className) }, rootProps, props, { children: [(0, jsx_runtime_1.jsx)("input", Object.assign({}, getInputProps(), { hidden: true })), children] })) }));
};
exports.MultipleFileUpload = MultipleFileUpload;
exports.MultipleFileUpload.displayName = 'MultipleFileUpload';
//# sourceMappingURL=MultipleFileUpload.js.map