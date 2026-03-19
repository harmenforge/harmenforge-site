require "json"

root_dir = Dir.pwd
output_dir = File.join(root_dir, "data")
output_file = File.join(output_dir, "models.js")
image_extensions = %w[.png .jpg .jpeg .webp .avif]

model_dirs = Dir.children(root_dir)
  .select { |entry| File.directory?(File.join(root_dir, entry)) && entry.match?(/^model[-_ ]?\d+/i) }
  .sort_by { |entry| entry.scan(/\d+/).first.to_i }

models = model_dirs.map do |directory|
  image_files = Dir.children(File.join(root_dir, directory))
    .select { |file_name| image_extensions.include?(File.extname(file_name).downcase) }
    .sort

  images = image_files.each_with_index.map do |file_name, index|
    {
      src: "./#{directory}/#{file_name.gsub(" ", "%20")}",
      alt: "#{directory.tr("-_", " ").split.map(&:capitalize).join(" ")} showcase image #{index + 1}"
    }
  end

  {
    folder: directory,
    title: directory.tr("-_", " ").split.map(&:capitalize).join(" "),
    description: "A refined AI model collage built for premium brand storytelling, campaign presentation, and editorial launch visuals.",
    imageCount: images.length,
    cover: images.first,
    images: images
  }
end

Dir.mkdir(output_dir) unless Dir.exist?(output_dir)
File.write(output_file, "window.HARMEN_FORGE_MODELS = #{JSON.pretty_generate(models)};\n")

puts "Generated data/models.js with #{models.length} model entries."
