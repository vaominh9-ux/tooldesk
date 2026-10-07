import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-[24px]">
      <h2 className="text-[28px] font-[750] text-[#202a43] mb-[8px]">404 - Không tìm thấy trang</h2>
      <p className="text-[13px] text-[#778197] max-w-[400px] mb-[20px]">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
      </p>
      <Link href="/" className="button primary">
        Quay về Trang chủ
      </Link>
    </div>
  );
}
