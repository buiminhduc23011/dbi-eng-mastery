import type { Lesson, Phrase } from '../lib/learning';

const p = (en: string, vi: string, chunks: string, note: string, blank: string, answer: string, alternatives: string[] = []): Phrase =>
  ({ en, vi, chunks, note, blank, answer, alternatives });
const l = (n: number, title: string, stage: string, goal: string, pattern: string, explanation: string, phrases: Phrase[]): Lesson =>
  ({ id: `foundation-${String(n).padStart(2, '0')}`, title, stage, goal, pattern, explanation, phrases });

export const curriculum: Lesson[] = [
  l(1, 'Nói điều bạn cần', 'Bắt đầu từ đây', 'Nhờ giúp đỡ và nói nhu cầu của mình.', 'I need + điều bạn cần', 'I là “tôi”, need là “cần”. Ghép điều bạn cần vào sau need. Không thêm am: I need help, không phải I am need help.', [
    p('I need help.', 'Tôi cần giúp đỡ.', 'I = tôi · need = cần · help = sự giúp đỡ', 'Need đã là động từ, không dùng thêm am.', 'I ___ help.', 'need'),
    p('I need more time.', 'Tôi cần thêm thời gian.', 'more = thêm · time = thời gian', 'More time là cả cụm “thêm thời gian”.', 'I need more ___.', 'time'),
    p('I need a break.', 'Tôi cần nghỉ một chút.', 'a break = một lần nghỉ ngắn', 'Dùng a trước break khi nói một lần nghỉ.', 'I need a ___.', 'break'),
  ]),
  l(2, 'Giới thiệu bản thân', 'Bắt đầu từ đây', 'Nói tên, nghề và nơi bạn đến từ.', 'I am + thông tin về mình', 'I am có thể viết ngắn thành I’m. Dùng để nói bạn là ai, ở đâu hoặc thế nào.', [
    p('I am Duc.', 'Tôi là Đức.', 'I am = tôi là · Duc = Đức', 'Tên riêng viết hoa. Bạn có thể dùng tên mình khi giao tiếp; bài này luyện câu mẫu với Duc.', 'I ___ Duc.', 'am'),
    p('I am an engineer.', 'Tôi là kỹ sư.', 'an engineer = một kỹ sư', 'Engineer bắt đầu bằng âm nguyên âm nên dùng an.', 'I am ___ engineer.', 'an'),
    p('I am from Vietnam.', 'Tôi đến từ Việt Nam.', 'from = đến từ · Vietnam = Việt Nam', 'I am from + tên nơi chốn.', 'I am ___ Vietnam.', 'from'),
  ]),
  l(3, 'Khi bạn chưa hiểu', 'Bắt đầu từ đây', 'Bình tĩnh nhờ người khác nói lại.', 'Can you + việc muốn nhờ?', 'Can you…? là cách nhờ người khác làm một việc. Please làm lời nhờ lịch sự hơn.', [
    p('I do not understand.', 'Tôi không hiểu.', 'do not = không · understand = hiểu', 'Có thể nói ngắn: I don’t understand.', 'I do not ___.', 'understand'),
    p('Can you repeat that?', 'Bạn có thể nhắc lại không?', 'Can you = bạn có thể · repeat = nhắc lại · that = điều đó', 'Sau can dùng động từ nguyên mẫu repeat.', 'Can you ___ that?', 'repeat', ['Could you repeat that?']),
    p('Please speak slowly.', 'Vui lòng nói chậm.', 'please = vui lòng · speak = nói · slowly = chậm', 'Slowly nói về cách nói, đứng sau speak.', 'Please speak ___.', 'slowly'),
  ]),
  l(4, 'Nói điều bạn muốn', 'Bắt đầu từ đây', 'Nói mong muốn bằng một câu ngắn.', 'I want to + việc muốn làm', 'I want + đồ vật. I want to + hành động. Ví dụ: I want water, nhưng I want to learn.', [
    p('I want to learn English.', 'Tôi muốn học tiếng Anh.', 'want to = muốn · learn = học · English = tiếng Anh', 'Sau want dùng to trước hành động learn.', 'I want to ___ English.', 'learn'),
    p('I want to try again.', 'Tôi muốn thử lại.', 'try = thử · again = lại', 'Try again là cụm dùng khi muốn thử thêm lần nữa.', 'I want to try ___.', 'again'),
    p('I want to go home.', 'Tôi muốn về nhà.', 'go home = về nhà', 'Nói go home, không cần to trước home.', 'I want to go ___.', 'home'),
  ]),
  l(5, 'Gọi đồ uống', 'Dùng mỗi ngày', 'Gọi món và cảm ơn lịch sự.', 'Can I have + món đồ + please?', 'Can I have…? dùng để xin hoặc gọi món. Không cần một câu dài để giao tiếp lịch sự.', [
    p('Can I have some water, please?', 'Cho tôi xin chút nước.', 'some water = một chút nước', 'Water không đếm từng cái nên dùng some water.', 'Can I have some ___, please?', 'water'),
    p('Can I have a coffee, please?', 'Cho tôi một cà phê.', 'a coffee = một phần cà phê', 'Trong quán, a coffee là cách gọi một phần cà phê.', 'Can I have a ___, please?', 'coffee'),
    p('Thank you for your help.', 'Cảm ơn bạn đã giúp đỡ.', 'thank you = cảm ơn · for = vì · your help = sự giúp đỡ của bạn', 'Thank you for + điều bạn biết ơn.', 'Thank you for your ___.', 'help'),
  ]),
  l(6, 'Hỏi thông tin', 'Dùng mỗi ngày', 'Hỏi vị trí, giá và giờ.', 'Where / How much / What time…?', 'Where hỏi ở đâu. How much hỏi giá. What time hỏi mấy giờ. Học từng câu như một cụm trước.', [
    p('Where is the bathroom?', 'Nhà vệ sinh ở đâu?', 'where = ở đâu · bathroom = nhà vệ sinh', 'Câu hỏi: Where + is + nơi cần tìm?', 'Where is the ___?', 'bathroom', ['Where is the restroom?']),
    p('How much is this?', 'Cái này bao nhiêu tiền?', 'how much = bao nhiêu tiền · this = cái này', 'Dùng this khi chỉ một vật gần mình.', 'How ___ is this?', 'much'),
    p('What time is it?', 'Bây giờ là mấy giờ?', 'what time = mấy giờ', 'Đây là câu hỏi giờ thông dụng, hãy nhớ cả cụm.', 'What ___ is it?', 'time'),
  ]),
  l(7, 'Thói quen của bạn', 'Dùng mỗi ngày', 'Kể vài điều đơn giản về một ngày.', 'I + hành động + thông tin thêm', 'Với I, dùng động từ như work, study, drink. Chưa cần thêm s vào động từ.', [
    p('I work from home.', 'Tôi làm việc tại nhà.', 'work = làm việc · from home = tại nhà', 'Work from home là cụm nói về làm việc ở nhà.', 'I ___ from home.', 'work'),
    p('I study English every day.', 'Tôi học tiếng Anh mỗi ngày.', 'study English = học tiếng Anh · every day = mỗi ngày', 'Every day thường đứng ở cuối câu.', 'I study English every ___.', 'day', ['I learn English every day.']),
    p('I drink coffee in the morning.', 'Tôi uống cà phê vào buổi sáng.', 'drink coffee = uống cà phê · in the morning = vào buổi sáng', 'Dùng in the morning để nói buổi sáng.', 'I drink coffee in the ___.', 'morning'),
  ]),
  l(8, 'Hẹn và báo trễ', 'Dùng mỗi ngày', 'Hẹn gặp và báo khi bạn đến muộn.', 'I will + hành động', 'I will (I’ll) nói về việc sẽ làm. Dùng in + khoảng thời gian để nói bao lâu nữa.', [
    p('I will be there soon.', 'Tôi sẽ đến đó sớm thôi.', 'will be there = sẽ có mặt ở đó · soon = sớm thôi', 'Sau will dùng be, không dùng am.', 'I will be there ___.', 'soon'),
    p('I am running late.', 'Tôi đang bị trễ.', 'running late = bị trễ giờ', 'Đây là cụm diễn đạt, không có nghĩa chạy bộ muộn.', 'I am running ___.', 'late'),
    p('See you tomorrow.', 'Hẹn gặp bạn ngày mai.', 'see you = hẹn gặp bạn · tomorrow = ngày mai', 'Câu chào tạm biệt ngắn, dùng được hằng ngày.', 'See you ___.', 'tomorrow'),
  ]),
  l(9, 'Báo việc đang làm', 'Tiếng Anh công việc', 'Nói ngắn gọn bạn đang xử lý việc gì.', 'I am + động từ-ing', 'Để nói việc đang diễn ra, dùng I am + động từ có đuôi ing. Ví dụ fix → fixing.', [
    p('I am fixing a bug.', 'Tôi đang sửa một lỗi.', 'fixing = đang sửa · a bug = một lỗi phần mềm', 'Fix → fixing. Không bỏ am trong câu này.', 'I am ___ a bug.', 'fixing'),
    p('I am checking the report.', 'Tôi đang kiểm tra báo cáo.', 'checking = đang kiểm tra · the report = báo cáo đó', 'The dùng khi người nghe biết báo cáo nào.', 'I am checking the ___.', 'report'),
    p('I am testing the system.', 'Tôi đang kiểm thử hệ thống.', 'testing = đang kiểm thử · the system = hệ thống', 'Test → testing để nói việc đang làm.', 'I am ___ the system.', 'testing'),
  ]),
  l(10, 'Nhờ đồng nghiệp', 'Tiếng Anh công việc', 'Nhờ gửi, kiểm tra và giải thích.', 'Could you + hành động + please?', 'Could you…? là lời nhờ lịch sự. Sau could dùng động từ nguyên mẫu, không thêm s hay ing.', [
    p('Could you send me the file?', 'Bạn gửi cho tôi tệp được không?', 'send me = gửi cho tôi · the file = tệp đó', 'Send + người nhận + vật cần gửi.', 'Could you ___ me the file?', 'send', ['Can you send me the file?']),
    p('Could you check this, please?', 'Bạn kiểm tra giúp cái này được không?', 'check = kiểm tra · this = cái này', 'Please có thể ở cuối câu.', 'Could you ___ this, please?', 'check', ['Can you check this, please?']),
    p('Could you explain this?', 'Bạn giải thích điều này được không?', 'explain = giải thích · this = điều này', 'Explain this, không cần thêm about.', 'Could you ___ this?', 'explain', ['Can you explain this?']),
  ]),
  l(11, 'Báo vấn đề', 'Tiếng Anh công việc', 'Nói vấn đề và đề nghị thêm thời gian.', 'The + sự vật + is…', 'Với một sự vật như server hoặc system, dùng is. Not làm câu mang nghĩa phủ định.', [
    p('The server is slow.', 'Máy chủ chạy chậm.', 'the server = máy chủ · slow = chậm', 'Is + tính từ slow mô tả tình trạng.', 'The server is ___.', 'slow'),
    p('The system is not working.', 'Hệ thống đang không hoạt động.', 'is not working = đang không hoạt động', 'Thêm not sau is để nói không.', 'The system is not ___.', 'working'),
    p('I need one more day.', 'Tôi cần thêm một ngày.', 'one more day = thêm một ngày', 'One more + danh từ số ít.', 'I need one more ___.', 'day'),
  ]),
  l(12, 'Một cuộc họp ngắn', 'Tiếng Anh công việc', 'Nói ý kiến và chốt bước tiếp theo.', 'I think + điều bạn nghĩ', 'I think là “tôi nghĩ”. Bạn có thể bắt đầu bằng câu ngắn, không cần dùng từ phức tạp trong cuộc họp.', [
    p('I think this is a good idea.', 'Tôi nghĩ đây là một ý hay.', 'I think = tôi nghĩ · a good idea = một ý hay', 'Idea là danh từ đếm được: a good idea.', 'I think this is a good ___.', 'idea'),
    p('I agree with you.', 'Tôi đồng ý với bạn.', 'agree = đồng ý · with you = với bạn', 'Agree đã là động từ: không thêm am.', 'I ___ with you.', 'agree'),
    p('What is the next step?', 'Bước tiếp theo là gì?', 'what = gì · the next step = bước tiếp theo', 'Câu hỏi hữu ích để kết thúc một phần thảo luận.', 'What is the next ___?', 'step'),
  ]),
  l(13, 'Đi xe và tìm đường', 'Đi lại & dịch vụ', 'Di chuyển trong thành phố và hỏi đúng điểm xuống.', 'I need to + địa điểm / hành động', 'Need to + động từ nói việc bạn cần làm. Dùng cụm go to để nói đi đến một nơi.', [
    p('I need to go to the station.', 'Tôi cần đến nhà ga.', 'need to = cần · go to = đi đến · station = nhà ga', 'Sau need to dùng động từ nguyên mẫu go.', 'I need to go to the ___.', 'station'),
    p('Where is the bus stop?', 'Trạm xe buýt ở đâu?', 'where = ở đâu · bus stop = trạm xe buýt', 'Bus stop là một cụm từ chỉ địa điểm.', 'Where is the ___ stop?', 'bus'),
    p('Does this bus go downtown?', 'Xe buýt này có đi vào trung tâm không?', 'does = có…không · go = đi · downtown = trung tâm', 'Sau does, dùng go, không thêm s.', 'Does this bus ___ downtown?', 'go'),
  ]),
  l(14, 'Ở sân bay', 'Đi lại & dịch vụ', 'Làm thủ tục và hỏi thông tin chuyến bay.', 'Where can I + việc cần làm?', 'Where can I…? hỏi bạn có thể làm việc gì ở đâu. Sau can luôn dùng động từ nguyên mẫu.', [
    p('Where can I check in?', 'Tôi làm thủ tục ở đâu?', 'where = ở đâu · check in = làm thủ tục', 'Check in là cụm động từ; giữ nguyên sau can.', 'Where can I ___ in?', 'check'),
    p('Here is my passport.', 'Đây là hộ chiếu của tôi.', 'here = đây · my = của tôi · passport = hộ chiếu', 'Here is… dùng khi đưa một vật cho người khác xem.', 'Here is my ___.', 'passport'),
    p('What time does the flight leave?', 'Chuyến bay khởi hành lúc mấy giờ?', 'what time = lúc mấy giờ · flight = chuyến bay · leave = khởi hành', 'Sau does dùng leave ở dạng nguyên mẫu.', 'What time does the flight ___?', 'leave'),
  ]),
  l(15, 'Nhận phòng khách sạn', 'Đi lại & dịch vụ', 'Nhận phòng và hỏi các tiện ích cơ bản.', 'I have + thứ đã đặt / mang theo', 'I have… có thể nói bạn đã đặt phòng hoặc đang có một thứ. Thêm tên mình với under my name.', [
    p('I have a reservation.', 'Tôi có đặt phòng trước.', 'reservation = đặt chỗ / đặt phòng', 'A reservation là một lượt đặt phòng.', 'I have a ___.', 'reservation'),
    p('The reservation is under my name.', 'Đặt phòng dưới tên của tôi.', 'under my name = dưới tên của tôi', 'Under my name là cụm thường dùng ở quầy lễ tân.', 'The reservation is under my ___.', 'name'),
    p('What time is breakfast?', 'Bữa sáng lúc mấy giờ?', 'what time = lúc mấy giờ · breakfast = bữa sáng', 'What time is…? dùng để hỏi thời gian diễn ra.', 'What time is ___?', 'breakfast'),
  ]),
  l(16, 'Mua sắm', 'Đi lại & dịch vụ', 'Hỏi giá, kích cỡ và cách thanh toán.', 'Do you have + món đồ?', 'Do you have…? hỏi cửa hàng có món đồ đó không. Dùng any trước danh từ số nhiều khi hỏi chung.', [
    p('Do you have this in a smaller size?', 'Mẫu này có cỡ nhỏ hơn không?', 'smaller = nhỏ hơn · size = kích cỡ', 'Smaller là dạng so sánh của small.', 'Do you have this in a smaller ___?', 'size'),
    p('How much does it cost?', 'Món này giá bao nhiêu?', 'how much = bao nhiêu · cost = có giá', 'It cost(s) hỏi giá của một món đồ.', 'How much does it ___?', 'cost'),
    p('Can I pay by card?', 'Tôi trả bằng thẻ được không?', 'pay = thanh toán · by card = bằng thẻ', 'Sau can dùng pay ở dạng nguyên mẫu.', 'Can I ___ by card?', 'pay'),
  ]),
  l(17, 'Gọi món ăn', 'Đi lại & dịch vụ', 'Gọi món và yêu cầu thay đổi đơn giản.', 'I would like + món muốn gọi', 'I would like (I’d like) lịch sự hơn I want khi gọi món. Thêm please để lời nói nhẹ nhàng.', [
    p('I would like the chicken, please.', 'Cho tôi gọi món gà.', 'would like = muốn (lịch sự) · chicken = thịt gà', 'Dùng the khi gọi món cụ thể trên thực đơn.', 'I would like the ___, please.', 'chicken'),
    p('Could I have the menu?', 'Cho tôi xin thực đơn được không?', 'could I have = cho tôi xin được không · menu = thực đơn', 'Could I…? là cách hỏi lịch sự.', 'Could I have the ___?', 'menu'),
    p('No onions, please.', 'Vui lòng không cho hành.', 'no = không có · onions = hành tây', 'No + danh từ là yêu cầu ngắn, dễ hiểu ở nhà hàng.', 'No ___, please.', 'onions'),
  ]),
  l(18, 'Khi có sự cố nhỏ', 'Đi lại & dịch vụ', 'Báo mất đồ hoặc nhờ tìm sự giúp đỡ.', 'I lost + đồ vật', 'Lost là quá khứ của lose. Dùng I lost… để báo thứ bạn đã làm mất.', [
    p('I lost my bag.', 'Tôi bị mất túi.', 'lost = đã làm mất · my bag = túi của tôi', 'Lose đổi thành lost ở quá khứ.', 'I ___ my bag.', 'lost'),
    p('Can you help me find it?', 'Bạn giúp tôi tìm nó được không?', 'help me = giúp tôi · find it = tìm nó', 'Sau help me có thể dùng động từ find.', 'Can you help me ___ it?', 'find'),
    p('I need a doctor.', 'Tôi cần bác sĩ.', 'doctor = bác sĩ', 'Câu ngắn, trực tiếp để xin hỗ trợ y tế.', 'I need a ___.', 'doctor'),
  ]),
  l(19, 'Nói về cảm xúc', 'Cuộc sống & giao tiếp', 'Diễn tả cảm xúc và lý do đơn giản.', 'I feel + cảm xúc', 'Feel là “cảm thấy”. Sau feel, thêm tính từ như tired hoặc happy.', [
    p('I feel tired today.', 'Hôm nay tôi thấy mệt.', 'feel = cảm thấy · tired = mệt · today = hôm nay', 'Tired là tính từ mô tả cảm giác.', 'I feel ___ today.', 'tired'),
    p('I am happy to be here.', 'Tôi vui vì được ở đây.', 'happy = vui · to be here = được ở đây', 'Happy to + hành động diễn tả điều khiến bạn vui.', 'I am ___ to be here.', 'happy'),
    p('I am a little nervous.', 'Tôi hơi lo lắng.', 'a little = hơi / một chút · nervous = lo lắng', 'A little đứng trước tính từ để giảm mức độ.', 'I am a little ___.', 'nervous'),
  ]),
  l(20, 'Sở thích của bạn', 'Cuộc sống & giao tiếp', 'Nói điều mình thích, không thích và thường làm.', 'I like / do not like + danh từ hoặc việc làm', 'Like có thể đi với một vật hoặc động từ thêm ing. Ví dụ: I like music; I like reading.', [
    p('I like listening to music.', 'Tôi thích nghe nhạc.', 'like = thích · listening to = nghe · music = nhạc', 'Sau like, listening có đuôi ing.', 'I like listening to ___.', 'music'),
    p('I do not like spicy food.', 'Tôi không thích đồ ăn cay.', 'do not like = không thích · spicy = cay', 'Spicy mô tả món ăn.', 'I do not like ___ food.', 'spicy'),
    p('What do you like to do?', 'Bạn thích làm gì?', 'what = gì · like to do = thích làm', 'Sau do, dùng like không thêm s.', 'What do you ___ to do?', 'like'),
  ]),
  l(21, 'Kể chuyện cuối tuần', 'Cuộc sống & giao tiếp', 'Kể ngắn một việc đã làm trong quá khứ.', 'Yesterday, I + động từ quá khứ', 'Dùng yesterday để nói về hôm qua. Một số động từ quá khứ thêm -ed; go đổi thành went.', [
    p('I watched a movie last night.', 'Tối qua tôi xem một bộ phim.', 'watched = đã xem · last night = tối qua', 'Watch thêm -ed để thành quá khứ.', 'I ___ a movie last night.', 'watched'),
    p('I went to the park.', 'Tôi đã đi công viên.', 'went = đã đi · park = công viên', 'Go là động từ bất quy tắc: quá khứ là went.', 'I ___ to the park.', 'went'),
    p('It was fun.', 'Việc đó rất vui.', 'it was = việc đó đã / thì · fun = vui', 'Was là dạng quá khứ của is cho một việc.', 'It ___ fun.', 'was'),
  ]),
  l(22, 'Nói về kế hoạch', 'Cuộc sống & giao tiếp', 'Kể dự định gần bằng câu ngắn.', 'I am going to + việc định làm', 'Going to nói về kế hoạch đã có. Sau to, dùng động từ nguyên mẫu: visit, meet, rest.', [
    p('I am going to visit my family.', 'Tôi định về thăm gia đình.', 'going to = định sẽ · visit = thăm · family = gia đình', 'Sau going to dùng động từ visit.', 'I am going to ___ my family.', 'visit'),
    p('We are going to meet at six.', 'Chúng tôi sẽ gặp nhau lúc sáu giờ.', 'we are going to = chúng tôi sẽ · meet = gặp', 'Với we dùng are going to.', 'We are going to ___ at six.', 'meet'),
    p('I am going to stay home.', 'Tôi định ở nhà.', 'stay home = ở nhà', 'Stay home là cụm tự nhiên, không cần thêm at.', 'I am going to ___ home.', 'stay'),
  ]),
  l(23, 'Hỏi đường', 'Cuộc sống & giao tiếp', 'Hiểu chỉ dẫn rẽ và đi thẳng.', 'Go straight / turn left / turn right', 'Đây là ba chỉ dẫn rất phổ biến. Left là trái, right là phải, straight là thẳng.', [
    p('Go straight ahead.', 'Đi thẳng về phía trước.', 'go straight = đi thẳng · ahead = phía trước', 'Straight ahead là cụm chỉ hướng.', 'Go ___ ahead.', 'straight'),
    p('Turn left at the corner.', 'Rẽ trái ở góc đường.', 'turn left = rẽ trái · corner = góc đường', 'At the corner chỉ vị trí cần rẽ.', 'Turn ___ at the corner.', 'left'),
    p('Is it far from here?', 'Chỗ đó có xa đây không?', 'far = xa · from here = từ đây', 'Is it…? dùng để hỏi về một địa điểm.', 'Is it ___ from here?', 'far'),
  ]),
  l(24, 'Sức khỏe và nghỉ ngơi', 'Cuộc sống & giao tiếp', 'Nói triệu chứng đơn giản và xin nghỉ.', 'I have + triệu chứng', 'Have a… dùng với một triệu chứng như a headache. Với sốt, thường nói I have a fever.', [
    p('I have a headache.', 'Tôi bị đau đầu.', 'headache = đau đầu', 'Headache là danh từ đếm được: dùng a headache.', 'I have a ___.', 'headache'),
    p('I have a fever.', 'Tôi bị sốt.', 'fever = cơn sốt', 'Dùng a trước fever.', 'I have a ___.', 'fever'),
    p('I need to rest.', 'Tôi cần nghỉ ngơi.', 'need to = cần · rest = nghỉ ngơi', 'Rest là động từ nguyên mẫu sau need to.', 'I need to ___.', 'rest'),
  ]),
  l(25, 'Gọi điện và nhắn tin', 'Giao tiếp tự tin hơn', 'Bắt đầu cuộc gọi và nhờ gọi lại.', 'Can I speak to + người?', 'Can I speak to…? hỏi xin nói chuyện với ai đó qua điện thoại. Dùng please để lịch sự.', [
    p('Can I speak to Anna, please?', 'Cho tôi nói chuyện với Anna được không?', 'speak to = nói chuyện với · please = vui lòng', 'Speak to + người bạn muốn gặp.', 'Can I speak ___ Anna, please?', 'to'),
    p('She is not available right now.', 'Hiện giờ cô ấy chưa tiện nghe máy.', 'not available = không tiện / không có mặt · right now = ngay lúc này', 'Available mô tả người có thể nghe máy.', 'She is not ___ right now.', 'available'),
    p('Could you call me back?', 'Bạn gọi lại cho tôi được không?', 'call me back = gọi lại cho tôi', 'Call someone back nghĩa là gọi lại cho người đó.', 'Could you call me ___?', 'back'),
  ]),
  l(26, 'Giải thích vì sao', 'Giao tiếp tự tin hơn', 'Nối ý với because và nói lý do rõ ràng.', '… because + lý do', 'Because nghĩa là “bởi vì”. Đặt lý do phía sau because để giải thích câu trước.', [
    p('I stayed home because I was tired.', 'Tôi ở nhà vì tôi mệt.', 'stayed home = đã ở nhà · because = vì · tired = mệt', 'Stay thêm -ed ở quá khứ.', 'I stayed home because I was ___.', 'tired'),
    p('I am late because of traffic.', 'Tôi đến trễ vì giao thông.', 'late = trễ · because of = vì · traffic = giao thông', 'Because of đứng trước danh từ traffic.', 'I am late because of ___.', 'traffic'),
    p('Can you tell me why?', 'Bạn nói cho tôi biết lý do được không?', 'tell me = nói cho tôi · why = tại sao', 'Why hỏi về lý do.', 'Can you tell me ___?', 'why'),
  ]),
  l(27, 'So sánh lựa chọn', 'Giao tiếp tự tin hơn', 'So sánh hai phương án quen thuộc.', 'A is + tính từ-er + than B', 'Than nghĩa là “hơn”. Với từ ngắn, thường thêm -er: faster, cheaper. Good đổi thành better.', [
    p('The train is faster than the bus.', 'Tàu nhanh hơn xe buýt.', 'faster = nhanh hơn · than = hơn', 'Fast thêm -er để so sánh.', 'The train is ___ than the bus.', 'faster'),
    p('This one is cheaper.', 'Cái này rẻ hơn.', 'this one = cái này · cheaper = rẻ hơn', 'Cheap thêm -er: cheaper.', 'This one is ___.', 'cheaper'),
    p('This option is better for me.', 'Lựa chọn này phù hợp với tôi hơn.', 'option = lựa chọn · better = tốt hơn · for me = với tôi', 'Good đổi thành better khi so sánh.', 'This option is ___ for me.', 'better'),
  ]),
  l(28, 'Đưa ra đề nghị', 'Giao tiếp tự tin hơn', 'Đề nghị giúp đỡ hoặc cùng làm việc gì.', 'Would you like to + hành động?', 'Would you like to…? là lời mời hoặc đề nghị lịch sự. Sau to dùng động từ nguyên mẫu.', [
    p('Would you like to join us?', 'Bạn muốn tham gia cùng chúng tôi không?', 'would you like to = bạn có muốn · join us = tham gia cùng chúng tôi', 'Sau like to dùng động từ join.', 'Would you like to ___ us?', 'join'),
    p('I can help you with that.', 'Tôi có thể giúp bạn việc đó.', 'can help = có thể giúp · with that = việc đó', 'Sau can dùng help không thêm s.', 'I can ___ you with that.', 'help'),
    p('Let me check for you.', 'Để tôi kiểm tra giúp bạn.', 'let me = để tôi · check = kiểm tra · for you = giúp bạn', 'Let me + động từ nguyên mẫu.', 'Let me ___ for you.', 'check'),
  ]),
  l(29, 'Xin phép và nhờ vả', 'Giao tiếp tự tin hơn', 'Hỏi xin phép và mượn đồ lịch sự.', 'May I / Could I + hành động?', 'May I…? xin phép trang trọng. Could I…? cũng là cách hỏi nhẹ nhàng. Sau may/could dùng động từ nguyên mẫu.', [
    p('May I sit here?', 'Tôi ngồi đây được không?', 'may I = tôi có thể / xin phép · sit here = ngồi đây', 'Sau may dùng sit, không thêm to.', 'May I ___ here?', 'sit'),
    p('Could I borrow your pen?', 'Tôi mượn bút của bạn được không?', 'borrow = mượn · your pen = bút của bạn', 'Borrow là mượn từ người khác.', 'Could I ___ your pen?', 'borrow'),
    p('Is it okay if I open the window?', 'Tôi mở cửa sổ có được không?', 'is it okay = có ổn không · if I = nếu tôi · window = cửa sổ', 'Is it okay if…? là cách xin phép thân thiện.', 'Is it ___ if I open the window?', 'okay'),
  ]),
  l(30, 'Nói điều mình chưa chắc', 'Giao tiếp tự tin hơn', 'Dùng perhaps và I am not sure để nói thận trọng.', 'I am not sure if + điều chưa chắc', 'I am not sure if… nghĩa là “tôi không chắc liệu…”. Perhaps nghĩa là “có lẽ”.', [
    p('I am not sure if he is coming.', 'Tôi không chắc liệu anh ấy có đến không.', 'not sure = không chắc · if = liệu · coming = đang / sẽ đến', 'Sau if, dùng một câu nhỏ có chủ ngữ và động từ.', 'I am not ___ if he is coming.', 'sure'),
    p('Perhaps we can try again.', 'Có lẽ chúng ta có thể thử lại.', 'perhaps = có lẽ · try again = thử lại', 'Perhaps thường đứng đầu câu.', '___ we can try again.', 'Perhaps'),
    p('Let me think about it.', 'Để tôi suy nghĩ về việc đó.', 'let me = để tôi · think about = suy nghĩ về', 'Think about + điều đang suy nghĩ.', 'Let me ___ about it.', 'think'),
  ]),
  l(31, 'Cập nhật tiến độ', 'Tiếng Anh công việc mở rộng', 'Báo phần đã xong và phần còn đang làm.', 'I have finished / I am working on…', 'Have finished nói việc đã hoàn thành. Am working on nói việc đang xử lý.', [
    p('I have finished the first task.', 'Tôi đã hoàn thành nhiệm vụ đầu tiên.', 'have finished = đã hoàn thành · first task = nhiệm vụ đầu tiên', 'Sau have dùng finished ở dạng quá khứ phân từ.', 'I have ___ the first task.', 'finished'),
    p('I am working on the report.', 'Tôi đang làm báo cáo.', 'working on = đang làm · report = báo cáo', 'Work on là cụm dùng khi đang xử lý một việc.', 'I am ___ on the report.', 'working'),
    p('I will send an update this afternoon.', 'Chiều nay tôi sẽ gửi cập nhật.', 'send an update = gửi cập nhật · this afternoon = chiều nay', 'Will + send nói về việc sẽ làm.', 'I will ___ an update this afternoon.', 'send'),
  ]),
  l(32, 'Thời hạn và ưu tiên', 'Tiếng Anh công việc mở rộng', 'Hỏi hạn chót và nói việc ưu tiên.', 'What is the deadline for + việc?', 'Deadline là hạn chót. Priority là ưu tiên. Dùng first để nói việc cần làm trước.', [
    p('What is the deadline for this task?', 'Hạn chót của nhiệm vụ này là khi nào?', 'deadline = hạn chót · task = nhiệm vụ', 'For nối deadline với việc cần hoàn thành.', 'What is the ___ for this task?', 'deadline'),
    p('This is my top priority.', 'Đây là việc ưu tiên hàng đầu của tôi.', 'top priority = ưu tiên hàng đầu', 'Priority là danh từ; top nhấn mạnh mức cao nhất.', 'This is my top ___.', 'priority'),
    p('I will finish this first.', 'Tôi sẽ hoàn thành việc này trước.', 'finish = hoàn thành · first = trước tiên', 'First thường đứng cuối câu để nhấn mạnh thứ tự.', 'I will finish this ___.', 'first'),
  ]),
  l(33, 'Báo vướng mắc', 'Tiếng Anh công việc mở rộng', 'Nói điều đang chặn tiến độ và xin thông tin.', 'I cannot… because + trở ngại', 'Cannot (can’t) nói việc chưa thể làm. Because giới thiệu lý do hoặc trở ngại.', [
    p('I cannot access the file.', 'Tôi không truy cập được tệp.', 'cannot access = không thể truy cập · file = tệp', 'Sau cannot dùng access nguyên mẫu.', 'I cannot ___ the file.', 'access'),
    p('I am waiting for approval.', 'Tôi đang chờ phê duyệt.', 'waiting for = đang chờ · approval = sự phê duyệt', 'Wait for + thứ hoặc người mình chờ.', 'I am ___ for approval.', 'waiting'),
    p('Could you share more details?', 'Bạn chia sẻ thêm chi tiết được không?', 'share = chia sẻ · more details = thêm chi tiết', 'Details thường ở dạng số nhiều.', 'Could you share more ___?', 'details'),
  ]),
  l(34, 'Làm rõ yêu cầu', 'Tiếng Anh công việc mở rộng', 'Hỏi lại mục tiêu và đầu ra cần có.', 'Do you mean + ý bạn hiểu?', 'Do you mean…? kiểm tra xem mình đã hiểu đúng ý người khác chưa.', [
    p('Do you mean the latest version?', 'Ý bạn là phiên bản mới nhất phải không?', 'do you mean = ý bạn là · latest version = phiên bản mới nhất', 'Latest là “mới nhất”, đứng trước version.', 'Do you mean the ___ version?', 'latest'),
    p('What should I include?', 'Tôi nên đưa những gì vào?', 'what = những gì · should = nên · include = đưa vào', 'Sau should dùng include nguyên mẫu.', 'What should I ___?', 'include'),
    p('Could you give me an example?', 'Bạn cho tôi một ví dụ được không?', 'give me = cho tôi · example = ví dụ', 'Give + người nhận + vật được đưa.', 'Could you give me an ___?', 'example'),
  ]),
  l(35, 'Phản hồi lịch sự', 'Tiếng Anh công việc mở rộng', 'Góp ý điểm cụ thể và xác nhận đã hiểu.', 'I suggest + việc nên làm', 'Suggest là “đề xuất”. I suggest… nói ý kiến nhẹ nhàng, hướng vào giải pháp.', [
    p('I suggest adding one more example.', 'Tôi đề xuất thêm một ví dụ nữa.', 'suggest = đề xuất · adding = việc thêm · one more = thêm một', 'Sau suggest, dùng động từ dạng ing.', 'I suggest ___ one more example.', 'adding'),
    p('This part is clear and helpful.', 'Phần này rõ ràng và hữu ích.', 'clear = rõ ràng · helpful = hữu ích', 'And nối hai tính từ clear và helpful.', 'This part is clear and ___.', 'helpful'),
    p('Thanks for the feedback.', 'Cảm ơn bạn đã góp ý.', 'thanks for = cảm ơn về · feedback = góp ý', 'Feedback là danh từ không đếm được trong cách dùng này.', 'Thanks for the ___.', 'feedback'),
  ]),
  l(36, 'Viết email ngắn', 'Tiếng Anh công việc mở rộng', 'Mở đầu, nêu mục đích và kết thúc email ngắn.', 'I am writing to + mục đích', 'I am writing to… là cách bắt đầu email để nêu lý do viết. To đi cùng động từ nguyên mẫu.', [
    p('I am writing to ask a question.', 'Tôi viết email để hỏi một câu.', 'writing = đang viết · to ask = để hỏi · question = câu hỏi', 'To ask nói mục đích của việc viết.', 'I am writing to ___ a question.', 'ask'),
    p('Please find the file attached.', 'Vui lòng xem tệp đính kèm.', 'please find = vui lòng xem · attached = được đính kèm', 'Attached nghĩa là được gửi kèm theo email.', 'Please find the file ___.', 'attached'),
    p('I look forward to your reply.', 'Tôi mong nhận được phản hồi của bạn.', 'look forward to = mong đợi · reply = phản hồi', 'Reply là câu trả lời qua email hoặc tin nhắn.', 'I look forward to your ___.', 'reply'),
  ]),
];
