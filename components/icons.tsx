import React from 'react';

const Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props} />
);

export const Icons = {
    Dashboard: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></Icon>
    ),
    Products: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 21h16"/><path d="M12 11v10"/><path d="M12 3v8"/><path d="m16 7-4 4-4-4"/></Icon>
    ),
    Receiving: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/><path d="M9 22V2"/></Icon>
    ),
    Dispatching: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M8 7l-5 5 5 5"/><path d="M3 12h18"/></Icon>
    ),
    Trash2: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></Icon>
    ),
    Suppliers: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></Icon>
    ),
    MapPin: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></Icon>
    ),
    FileText: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></Icon>
    ),
    Printer: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></Icon>
    ),
    Settings: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></Icon>
    ),
    Logo: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></Icon>
    ),
    PlusCircle: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></Icon>
    ),
    Edit: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></Icon>
    ),
    SearchCheck: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="m8 11 4 4 8-8" /><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Icon>
    ),
    Download: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Icon>
    ),
    List: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></Icon>
    ),
    AlertTriangle: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></Icon>
    ),
    X: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></Icon>
    ),
    CalendarClock: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5m-4.5 0a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0"/><path d="M17.5 15.2V18l1.8 1.1"/></Icon>
    ),
    CheckCircle: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Icon>
    ),
    Info: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></Icon>
    ),
    Upload: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></Icon>
    ),
    Wifi: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></Icon>
    ),
    WifiOff: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A11 11 0 0 1 22 12.55"></path><path d="M5 12.55a11 11 0 0 1 11.06-1.72"></path><path d="M12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="1" y1="9" x2="3" y2="11"></line><path d="M3.22 7.78A16 16 0 0 1 12 4.26"></path></Icon>
    ),
    Zap: (props: React.SVGProps<SVGSVGElement>) => (
        <Icon {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></Icon>
    ),
};
