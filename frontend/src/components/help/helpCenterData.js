export const helpTopics = [
  {
    id: 'quick',
    icon: 'search',
    title: 'Bắt đầu kiểm tra quán',
    desc: 'Dán link hoặc tải file bình luận để xem quán được khen chê gì.',
  },
  {
    id: 'read',
    icon: 'dashboard',
    title: 'Cách đọc kết quả',
    desc: 'Hiểu tỷ lệ hài lòng, cảnh báo, xu hướng và từ khóa nổi bật.',
  },
  {
    id: 'decision',
    icon: 'thumbsUp',
    title: 'Quyết định có nên đi',
    desc: 'Nhìn nhanh dấu hiệu nên thử hoặc nên cân nhắc trước khi đến.',
  },
  {
    id: 'problem',
    icon: 'alert',
    title: 'Khi kết quả bất thường',
    desc: 'Giải thích trường hợp không có dữ liệu hoặc phản hồi chưa cập nhật.',
  },
];

export const helpQuestions = [
  {
    id: 'worth',
    topic: 'decision',
    question: 'Làm sao biết quán này có đáng ăn không?',
    answer: `Để biết một quán có đáng ăn hay không, bạn nên xem theo 3 lớp thông tin thay vì chỉ đọc vài bình luận đầu tiên.

Đầu tiên hãy nhìn tỷ lệ khách hài lòng. Nếu tỷ lệ này cao, nghĩa là phần lớn bình luận đang nghiêng về trải nghiệm tốt. Nhưng con số này chưa đủ để kết luận ngay, vì có quán được khen nhiều nhưng vẫn tồn tại vài vấn đề quan trọng như phục vụ chậm, món không ổn định hoặc giá cao.

Tiếp theo hãy xem khu vực cảnh báo. Đây là nơi gom các phản hồi có khả năng ảnh hưởng trực tiếp đến quyết định đi ăn, ví dụ khách than chờ lâu, món nguội, món không như hình, nhân viên khó chịu hoặc vệ sinh chưa ổn. Nếu cùng một vấn đề xuất hiện nhiều lần, bạn nên cân nhắc kỹ.

Cuối cùng hãy xem bản đồ từ khóa và bảng khen/chê. Nếu các từ tích cực như ngon, sạch, phục vụ tốt, giá hợp lý xuất hiện nhiều hơn các từ tiêu cực, quán có tín hiệu đáng thử. Nếu các từ tiêu cực lặp lại mạnh, bạn nên đọc kỹ bình luận trước khi quyết định.`,
  },
  {
    id: 'link',
    topic: 'quick',
    question: 'Tôi kiểm tra một quán bằng link như thế nào?',
    answer: `Bạn vào mục Trình phân tích URL, dán đường dẫn của quán Foody hoặc gian hàng cần kiểm tra, sau đó bấm nút Thu thập.

Sau khi bấm, hệ thống sẽ bắt đầu đọc các bình luận trên đường dẫn đó. Nếu dữ liệu nhiều, quá trình này có thể mất một lúc. Bạn không cần đứng yên ở trang đó, vẫn có thể chuyển sang Bảng điều khiển, Báo cáo hoặc các mục khác để tiếp tục xem dữ liệu.

Khi hệ thống xử lý xong, kết quả sẽ được lưu lại theo tài khoản đang đăng nhập. Bạn có thể xem kết luận nhanh ở Bảng điều khiển: tổng số phản hồi, tỷ lệ hài lòng, cảnh báo cần chú ý và xu hướng gần đây. Nếu muốn nhìn kỹ hơn từng nguồn dữ liệu, từ khóa và biểu đồ, hãy chuyển sang trang Báo cáo.

Nếu một đường dẫn đã từng được thu thập trước đó, hệ thống có thể chỉ lấy những bình luận mới để tránh trùng dữ liệu.`,
  },
  {
    id: 'csv',
    topic: 'quick',
    question: 'Nếu tôi có file bình luận thì làm sao?',
    answer: `Nếu bạn đã có sẵn danh sách bình luận trong file, hãy vào mục Dự đoán hàng loạt và chọn file CSV.

File nên có một cột chứa nội dung bình luận rõ ràng. Tên cột có thể là content, comment, review, bình luận hoặc nội dung. Sau khi tải file lên, hãy xem bảng xem trước ở bên phải để kiểm tra hệ thống đã đọc đúng bình luận chưa.

Nếu bảng xem trước hiển thị đúng nội dung, bạn bấm Bắt đầu xử lý. Hệ thống sẽ ghi nhận nhiều bình luận cùng lúc, phù hợp khi bạn đã có dữ liệu từ Excel, Google Sheet, Foody, Shopee hoặc một nguồn khác.

Sau khi xử lý xong, dữ liệu trong file cũng được tính vào Bảng điều khiển và Báo cáo. Nhờ vậy bạn có thể so sánh dữ liệu từ file CSV với dữ liệu thu thập từ đường dẫn.`,
  },
  {
    id: 'satisfaction',
    topic: 'read',
    question: 'Tỷ lệ hài lòng nên hiểu như thế nào?',
    answer: `Tỷ lệ hài lòng là tỷ lệ bình luận có xu hướng tốt trong toàn bộ dữ liệu đã ghi nhận. Ví dụ nếu hệ thống có 100 bình luận và 75 bình luận là khen, tỷ lệ hài lòng sẽ khoảng 75%.

Chỉ số này giúp bạn nắm nhanh cảm nhận chung của khách. Tỷ lệ càng cao thì khả năng quán đang được khách đánh giá tốt càng lớn. Tuy nhiên, bạn không nên dùng riêng chỉ số này để quyết định.

Một quán có tỷ lệ hài lòng cao vẫn có thể có vấn đề đáng chú ý, chẳng hạn khách rất khen món ăn nhưng lại chê chờ lâu hoặc phục vụ chưa tốt. Vì vậy sau khi xem tỷ lệ hài lòng, bạn nên kiểm tra thêm cảnh báo cần xử lý, bản đồ từ khóa và bảng xếp hạng khen/chê.

Cách đọc hợp lý là: tỷ lệ hài lòng cho bạn biết bức tranh tổng thể, còn cảnh báo và từ khóa giúp bạn hiểu lý do đằng sau con số đó.`,
  },
  {
    id: 'warning',
    topic: 'read',
    question: 'Cảnh báo cần xử lý có ý nghĩa gì?',
    answer: `Cảnh báo cần xử lý là nhóm bình luận có dấu hiệu tiêu cực hoặc có khả năng làm người dùng cân nhắc lại trước khi đến quán.

Ví dụ: khách nói món không ngon, đồ ăn nguội, chờ quá lâu, nhân viên phục vụ kém, giá cao, quán không sạch, không gian chật hoặc trải nghiệm không giống quảng cáo. Những phản hồi này được đưa lên đầu để bạn không cần đọc hàng trăm bình luận mới thấy vấn đề.

Quan trọng nhất là xem vấn đề có lặp lại hay không. Nếu chỉ một người phàn nàn thì có thể đó là trải nghiệm cá nhân. Nhưng nếu nhiều người cùng nhắc đến một vấn đề như chờ lâu hoặc phục vụ kém, đó là tín hiệu cần chú ý.

Với người dùng đang chọn quán ăn, mục cảnh báo giúp trả lời câu hỏi: “Nếu mình đến quán này thì có rủi ro gì cần biết trước?”.`,
  },
  {
    id: 'keywords',
    topic: 'read',
    question: 'Bản đồ từ khóa giúp gì cho tôi?',
    answer: `Bản đồ từ khóa giúp bạn nhìn nhanh những điều khách nhắc đến nhiều nhất về quán. Từ càng lớn thì càng xuất hiện nhiều trong bình luận.

Nếu các từ màu xanh nổi bật, đó thường là những điểm được khách khen như ngon, sạch, phục vụ tốt, rộng rãi, giá hợp lý hoặc lên món nhanh. Nếu các từ màu đỏ nổi bật, đó thường là vấn đề bị phàn nàn như chờ lâu, không ngon, mắc, thái độ kém, nóng, ồn hoặc món nguội.

Khi bạn không có thời gian đọc từng bình luận, bản đồ từ khóa đóng vai trò như bản tóm tắt nhanh. Chỉ cần nhìn vài từ lớn nhất, bạn có thể biết khách đang nhớ đến quán vì điều gì.

Nên đọc bản đồ từ khóa cùng với tỷ lệ hài lòng. Ví dụ tỷ lệ hài lòng cao và từ khóa lớn là ngon, sạch, phục vụ tốt thì tín hiệu rất tích cực. Ngược lại nếu tỷ lệ hài lòng thấp và từ khóa lớn là chờ lâu, không ngon, giá cao thì nên cân nhắc.`,
  },
  {
    id: 'zero',
    topic: 'problem',
    question: 'Vì sao phân tích URL trả về 0 phản hồi?',
    answer: `Khi hệ thống trả về 0 phản hồi, điều đó không nhất thiết là lỗi. Có vài trường hợp thường gặp.

Trường hợp thứ nhất: đường dẫn này đã từng được thu thập trước đó và hiện chưa có bình luận mới. Để tránh trùng dữ liệu, hệ thống có thể bỏ qua các bình luận đã lưu rồi.

Trường hợp thứ hai: trang hiện không có bình luận công khai, bình luận bị ẩn, hoặc nội dung tải quá chậm khiến bộ thu thập không đọc được.

Trường hợp thứ ba: đường dẫn không đúng loại trang mà hệ thống hỗ trợ, ví dụ link bị rút gọn, link yêu cầu đăng nhập hoặc link không phải trang quán/gian hàng có bình luận.

Với người dùng, thông báo thân thiện nên hiểu là: hệ thống đã kiểm tra đường dẫn này, nhưng hiện chưa có phản hồi mới để cập nhật.`,
  },
  {
    id: 'late',
    topic: 'problem',
    question: 'Vì sao Bảng điều khiển chưa cập nhật ngay?',
    answer: `Bảng điều khiển có thể chưa cập nhật ngay vì một số thao tác được chạy ngầm để bạn vẫn dùng được giao diện bình thường.

Ví dụ khi bạn thu thập bình luận từ một đường dẫn hoặc tải lên file CSV lớn, hệ thống cần thời gian để đọc dữ liệu, ghi nhận kết quả và tổng hợp lại các chỉ số. Trong lúc đó bạn vẫn có thể chuyển trang, xem báo cáo cũ hoặc tiếp tục thao tác.

Nếu vừa xử lý xong mà số liệu chưa đổi, bạn có thể đợi một chút rồi bấm làm mới dữ liệu. Nếu hệ thống báo không có phản hồi mới, số liệu có thể giữ nguyên vì không có bình luận mới được thêm vào.

Nói ngắn gọn: Bảng điều khiển là nơi xem kết quả sau khi dữ liệu đã được ghi nhận xong, nên đôi khi sẽ cập nhật chậm hơn thao tác thu thập một chút.`,
  },
];

export const helpQuickLinks = [
  { to: '/url-analyzer', label: 'Kiểm tra bằng link quán', desc: 'Dán đường dẫn để thu thập bình luận.' },
  { to: '/batch-prediction', label: 'Kiểm tra bằng file CSV', desc: 'Tải file bình luận để phân tích hàng loạt.' },
  { to: '/dashboard', label: 'Xem kết luận nhanh', desc: 'Xem tỷ lệ hài lòng và cảnh báo.' },
  { to: '/report', label: 'Xem báo cáo chi tiết', desc: 'Xem biểu đồ và bản đồ từ khóa.' },
];
