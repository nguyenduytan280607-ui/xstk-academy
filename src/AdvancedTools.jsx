import React from 'react';
const MAP={'Máy tính nâng cao':'maytinh-normal','Đồ thị phân phối':'dothi','Mô phỏng thống kê':'mophong-galton','Bảng tra thống kê':'bangtra'};
export default function AdvancedTools({page}) {return <section className="xstk-upgrade"><div className="xstk-upgrade-heading"><h2>{page}</h2><p>Công cụ tương tác · Tính toán ngay trên trình duyệt</p></div><iframe key={page} title={page} src={'/xstk-tools/index.html#'+MAP[page]} loading="eager" className="xstk-upgrade-frame" /></section>}
