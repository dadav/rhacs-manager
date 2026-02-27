"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarMonth = exports.Weekday = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const TextInput_1 = require("../TextInput");
const Button_1 = require("../Button");
const Select_1 = require("../Select");
const MenuToggle_1 = require("../MenuToggle");
const InputGroup_1 = require("../InputGroup");
const angle_left_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-left-icon'));
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const react_styles_1 = require("@patternfly/react-styles");
const calendar_month_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/CalendarMonth/calendar-month"));
const util_1 = require("../../helpers/util");
const datetimeUtils_1 = require("../../helpers/datetimeUtils");
var Weekday;
(function (Weekday) {
    Weekday[Weekday["Sunday"] = 0] = "Sunday";
    Weekday[Weekday["Monday"] = 1] = "Monday";
    Weekday[Weekday["Tuesday"] = 2] = "Tuesday";
    Weekday[Weekday["Wednesday"] = 3] = "Wednesday";
    Weekday[Weekday["Thursday"] = 4] = "Thursday";
    Weekday[Weekday["Friday"] = 5] = "Friday";
    Weekday[Weekday["Saturday"] = 6] = "Saturday";
})(Weekday || (exports.Weekday = Weekday = {}));
const buildCalendar = (year, month, weekStart, validators) => {
    const defaultDate = new Date(year, month);
    const firstDayOfWeek = new Date(defaultDate);
    firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay() + weekStart);
    // We will show a maximum of 6 weeks like Google calendar
    // Assume we just want the numbers for now...
    const calendarWeeks = [];
    if (firstDayOfWeek.getMonth() === defaultDate.getMonth() && firstDayOfWeek.getDate() !== 1) {
        firstDayOfWeek.setDate(firstDayOfWeek.getDate() - 7);
    }
    for (let i = 0; i < 6; i++) {
        const week = [];
        for (let j = 0; j < 7; j++) {
            const date = new Date(firstDayOfWeek);
            week.push({
                date,
                isValid: validators.every((validator) => validator(date))
            });
            firstDayOfWeek.setDate(firstDayOfWeek.getDate() + 1);
        }
        calendarWeeks.push(week);
        if (firstDayOfWeek.getMonth() !== defaultDate.getMonth()) {
            break;
        }
    }
    return calendarWeeks;
};
const isSameDate = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
const today = new Date();
/** The main calendar month component. */
const CalendarMonth = (_a) => {
    var { date: dateProp, locale = undefined, monthFormat = (date) => date.toLocaleDateString(locale, { month: 'long' }), weekdayFormat = (date) => date.toLocaleDateString(locale, { weekday: 'narrow' }), longWeekdayFormat = (date) => date.toLocaleDateString(locale, { weekday: 'long' }), dayFormat = (date) => date.getDate(), weekStart = 0, // Use the American Sunday as a default
    onChange = () => { }, validators = [() => true], className, onSelectToggle = () => { }, onMonthChange = () => { }, rangeStart, prevMonthAriaLabel = 'Previous month', nextMonthAriaLabel = 'Next month', yearInputAriaLabel = 'Select year', cellAriaLabel, isDateFocused = false, inlineProps } = _a, props = tslib_1.__rest(_a, ["date", "locale", "monthFormat", "weekdayFormat", "longWeekdayFormat", "dayFormat", "weekStart", "onChange", "validators", "className", "onSelectToggle", "onMonthChange", "rangeStart", "prevMonthAriaLabel", "nextMonthAriaLabel", "yearInputAriaLabel", "cellAriaLabel", "isDateFocused", "inlineProps"]);
    const longMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        .map((monthNum) => new Date(1990, monthNum))
        .map(monthFormat);
    const [isSelectOpen, setIsSelectOpen] = (0, react_1.useState)(false);
    const getInitialDate = () => {
        if ((0, datetimeUtils_1.isValidDate)(dateProp)) {
            return dateProp;
        }
        if ((0, datetimeUtils_1.isValidDate)(rangeStart)) {
            return rangeStart;
        }
        return today;
    };
    const initialDate = getInitialDate();
    const [focusedDate, setFocusedDate] = (0, react_1.useState)(initialDate);
    // Must be numeric given current header design
    const yearFormat = (date) => date.getFullYear();
    //
    const yearFormatted = yearFormat(focusedDate);
    const [yearInput, setYearInput] = (0, react_1.useState)(yearFormatted.toString());
    const [hoveredDate, setHoveredDate] = (0, react_1.useState)(undefined);
    const focusRef = (0, react_1.useRef)(undefined);
    const [hiddenMonthId] = (0, react_1.useState)((0, util_1.getUniqueId)('hidden-month-span'));
    const [shouldFocus, setShouldFocus] = (0, react_1.useState)(false);
    const isValidated = (date) => validators.every((validator) => validator(date));
    const focusedDateValidated = isValidated(focusedDate);
    (0, react_1.useEffect)(() => {
        if ((0, datetimeUtils_1.isValidDate)(dateProp) && !isSameDate(focusedDate, dateProp)) {
            setFocusedDate(dateProp);
        }
        else if (!dateProp) {
            setFocusedDate(today);
        }
    }, [dateProp]);
    (0, react_1.useEffect)(() => {
        // Calendar month should not be focused on page load
        if ((shouldFocus || isDateFocused) && focusedDateValidated && focusRef.current) {
            focusRef.current.focus();
        }
    }, [focusedDate, isDateFocused, focusedDateValidated, focusRef]);
    const onMonthClick = (ev, newDate) => {
        setFocusedDate(newDate);
        setShouldFocus(false);
        onMonthChange(ev, newDate);
        setYearInput(yearFormat(newDate).toString());
    };
    const onKeyDown = (ev) => {
        const newDate = new Date(focusedDate);
        if (ev.key === 'ArrowUp') {
            newDate.setDate(newDate.getDate() - 7);
        }
        else if (ev.key === 'ArrowRight') {
            newDate.setDate(newDate.getDate() + 1);
        }
        else if (ev.key === 'ArrowDown') {
            newDate.setDate(newDate.getDate() + 7);
        }
        else if (ev.key === 'ArrowLeft') {
            newDate.setDate(newDate.getDate() - 1);
        }
        if (newDate.getTime() !== focusedDate.getTime() && isValidated(newDate)) {
            ev.preventDefault();
            setFocusedDate(newDate);
            setShouldFocus(true);
        }
    };
    const changeYear = (newYear) => changeMonth(focusedDate.getMonth(), newYear);
    const changeMonth = (newMonth, newYear) => new Date(newYear !== null && newYear !== void 0 ? newYear : focusedDate.getFullYear(), newMonth, 1);
    const MIN_YEAR = 1900;
    const MAX_YEAR = 2100;
    const handleYearInputChange = (event, yearStr) => {
        if (!/^\d{0,4}$/.test(yearStr)) {
            return;
        }
        setYearInput(yearStr);
        if (yearStr.length === 4) {
            const yearNum = Number(yearStr);
            if (yearNum >= MIN_YEAR && yearNum <= MAX_YEAR) {
                const newDate = changeYear(yearNum);
                setFocusedDate(newDate);
                setShouldFocus(false);
                // We need to manually focus the year input in FireFox when the scroll buttons are clicked, as FireFox doesn't place focus automatically
                event.target.focus();
                onMonthChange(event, newDate);
            }
            else {
                setYearInput(yearFormatted.toString());
            }
        }
    };
    const addMonth = (toAdd) => {
        let newMonth = focusedDate.getMonth() + toAdd;
        let newYear = focusedDate.getFullYear();
        if (newMonth === -1) {
            newMonth = 11;
            newYear--;
        }
        else if (newMonth === 12) {
            newMonth = 0;
            newYear++;
        }
        return changeMonth(newMonth, newYear);
    };
    const prevMonth = addMonth(-1);
    const nextMonth = addMonth(1);
    const focusedYear = focusedDate.getFullYear();
    const focusedMonth = focusedDate.getMonth();
    const calendar = (0, react_1.useMemo)(() => buildCalendar(focusedYear, focusedMonth, weekStart, validators), [focusedYear, focusedMonth, weekStart, validators]);
    if (!focusedDateValidated) {
        const toFocus = calendar
            .reduce((acc, cur) => [...acc, ...cur], [])
            .filter(({ date, isValid }) => isValid && date.getMonth() === focusedMonth)
            .map(({ date }) => ({ date, days: Math.abs(focusedDate.getTime() - date.getTime()) }))
            .sort((o1, o2) => o1.days - o2.days)
            .map(({ date }) => date)[0];
        if (toFocus) {
            setFocusedDate(toFocus);
        }
    }
    const isHoveredDateValid = hoveredDate && isValidated(hoveredDate);
    const monthFormatted = monthFormat(focusedDate);
    const calendarToRender = ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(calendar_month_1.default.calendarMonth, className) }, props, { children: [(0, jsx_runtime_1.jsxs)("div", { className: calendar_month_1.default.calendarMonthHeader, children: [(0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(calendar_month_1.default.calendarMonthHeaderNavControl, 'pf-m-prev-month'), children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "plain", "aria-label": prevMonthAriaLabel, onClick: (ev) => onMonthClick(ev, prevMonth), icon: (0, jsx_runtime_1.jsx)(angle_left_icon_1.default, {}) }) }), (0, jsx_runtime_1.jsxs)(InputGroup_1.InputGroup, { children: [(0, jsx_runtime_1.jsx)(InputGroup_1.InputGroupItem, { isFill: true, children: (0, jsx_runtime_1.jsxs)("div", { className: calendar_month_1.default.calendarMonthHeaderMonth, children: [(0, jsx_runtime_1.jsx)("span", { id: hiddenMonthId, hidden: true, children: "Month" }), (0, jsx_runtime_1.jsx)(Select_1.Select, { toggle: (toggleRef) => ((0, jsx_runtime_1.jsx)(MenuToggle_1.MenuToggle, { ref: toggleRef, onClick: () => setIsSelectOpen(!isSelectOpen), isExpanded: isSelectOpen, style: { width: '140px' }, children: monthFormatted })), "aria-labelledby": hiddenMonthId, isOpen: isSelectOpen, onOpenChange: (isOpen) => {
                                                setIsSelectOpen(isOpen);
                                                onSelectToggle(isOpen);
                                            }, onSelect: (ev, monthNum) => {
                                                setIsSelectOpen(false);
                                                onSelectToggle(false);
                                                const newDate = changeMonth(Number(monthNum));
                                                setFocusedDate(newDate);
                                                setShouldFocus(false);
                                                onMonthChange(ev, newDate);
                                            }, selected: monthFormatted, popperProps: { appendTo: 'inline' }, children: (0, jsx_runtime_1.jsx)(Select_1.SelectList, { children: longMonths.map((longMonth, index) => ((0, jsx_runtime_1.jsx)(Select_1.SelectOption, { value: index, isSelected: longMonth === monthFormatted, children: longMonth }, index))) }) })] }) }), (0, jsx_runtime_1.jsx)(InputGroup_1.InputGroupItem, { children: (0, jsx_runtime_1.jsx)("div", { className: calendar_month_1.default.calendarMonthHeaderYear, children: (0, jsx_runtime_1.jsx)(TextInput_1.TextInput, { "aria-label": yearInputAriaLabel, type: "number", value: yearInput, onChange: handleYearInputChange }) }) })] }), (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(calendar_month_1.default.calendarMonthHeaderNavControl, 'pf-m-next-month'), children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "plain", "aria-label": nextMonthAriaLabel, onClick: (ev) => onMonthClick(ev, nextMonth), icon: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }) })] }), (0, jsx_runtime_1.jsxs)("table", { className: calendar_month_1.default.calendarMonthCalendar, onMouseLeave: () => setHoveredDate(undefined), children: [(0, jsx_runtime_1.jsx)("thead", { className: calendar_month_1.default.calendarMonthDays, children: (0, jsx_runtime_1.jsx)("tr", { children: calendar[0].map(({ date }, index) => ((0, jsx_runtime_1.jsxs)("th", { className: calendar_month_1.default.calendarMonthDay, scope: "col", children: [(0, jsx_runtime_1.jsx)("span", { className: "pf-v6-screen-reader", children: longWeekdayFormat(date) }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": true, children: weekdayFormat(date) })] }, index))) }) }), (0, jsx_runtime_1.jsx)("tbody", { onKeyDown: onKeyDown, children: calendar.map((week, index) => ((0, jsx_runtime_1.jsx)("tr", { className: calendar_month_1.default.calendarMonthDatesRow, children: week.map(({ date, isValid }, index) => {
                                const dayFormatted = dayFormat(date);
                                const isToday = isSameDate(date, today);
                                const isSelected = (0, datetimeUtils_1.isValidDate)(dateProp) && isSameDate(date, dateProp);
                                const isFocused = isSameDate(date, focusedDate);
                                const isAdjacentMonth = date.getMonth() !== focusedDate.getMonth();
                                const isRangeStart = (0, datetimeUtils_1.isValidDate)(rangeStart) && isSameDate(date, rangeStart);
                                let isInRange = false;
                                let isRangeEnd = false;
                                if ((0, datetimeUtils_1.isValidDate)(rangeStart)) {
                                    let rangeEndDate;
                                    if ((0, datetimeUtils_1.isValidDate)(dateProp)) {
                                        rangeEndDate = dateProp;
                                    }
                                    if (isHoveredDateValid && (!(0, datetimeUtils_1.isValidDate)(dateProp) || hoveredDate > dateProp)) {
                                        rangeEndDate = hoveredDate;
                                    }
                                    if (rangeEndDate) {
                                        isInRange = date >= rangeStart && date <= rangeEndDate;
                                        isRangeEnd = isSameDate(date, rangeEndDate);
                                    }
                                    // Core would likely need new styles for "is selected but disabled"
                                }
                                return ((0, jsx_runtime_1.jsx)("td", { className: (0, react_styles_1.css)(calendar_month_1.default.calendarMonthDatesCell, isAdjacentMonth && calendar_month_1.default.modifiers.adjacentMonth, isToday && calendar_month_1.default.modifiers.current, (isSelected || isRangeStart) && calendar_month_1.default.modifiers.selected, !isValid && !(isInRange || isRangeStart || isRangeEnd || isSelected) && calendar_month_1.default.modifiers.disabled, isInRange && calendar_month_1.default.modifiers.inRange, isRangeStart && calendar_month_1.default.modifiers.startRange, isRangeEnd && calendar_month_1.default.modifiers.endRange), children: (0, jsx_runtime_1.jsx)("button", Object.assign({ className: (0, react_styles_1.css)(calendar_month_1.default.calendarMonthDate, isRangeEnd && calendar_month_1.default.modifiers.hover, !isValid && calendar_month_1.default.modifiers.disabled), type: "button", onClick: (event) => onChange(event, date), onMouseOver: () => setHoveredDate(date), tabIndex: isFocused ? 0 : -1, disabled: !isValid, "aria-label": cellAriaLabel
                                            ? cellAriaLabel(date)
                                            : `${dayFormat(date)} ${monthFormat(date)} ${yearFormat(date)}` }, (isFocused && { ref: focusRef }), { children: dayFormatted })) }, index));
                            }) }, index))) })] })] })));
    if (inlineProps !== undefined) {
        const Component = (inlineProps.component ? inlineProps.component : 'article');
        return ((0, jsx_runtime_1.jsxs)(Component, Object.assign({}, (inlineProps.ariaLabelledby && { 'aria-labelledby': inlineProps.ariaLabelledby }), { children: [inlineProps.title, calendarToRender] })));
    }
    return calendarToRender;
};
exports.CalendarMonth = CalendarMonth;
exports.CalendarMonth.displayName = 'CalendarMonth';
//# sourceMappingURL=CalendarMonth.js.map